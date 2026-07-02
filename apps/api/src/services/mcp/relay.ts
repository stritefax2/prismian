import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { McpToolDescriptor } from "../../shared/index.js";

// Upstream MCP relay. Prismian acts as an MCP *client* toward the vendor's
// server (Linear, Sentry, Notion, ...), holding the credential server-side
// and forwarding tool calls on behalf of agent keys.
//
// Deliberately connection-per-call: the API deploys to Vercel where nothing
// survives between invocations, so a persistent session pool would only
// work in self-hosted mode and create two divergent behaviors. The
// initialize handshake costs one extra round-trip per call — acceptable
// for v1, revisit with a keyed session cache if relay latency matters.

const LIST_TOOLS_TIMEOUT_MS = 15_000;
const CALL_TOOL_TIMEOUT_MS = 60_000;

export interface UpstreamAuth {
  auth_token?: string;
  headers?: Record<string, string>;
}

export class McpUpstreamError extends Error {
  code = "mcp_upstream_error";
  constructor(message: string) {
    super(message);
  }
}

function buildHeaders(auth: UpstreamAuth | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (auth?.auth_token) {
    headers["Authorization"] = `Bearer ${auth.auth_token}`;
  }
  for (const [k, v] of Object.entries(auth?.headers ?? {})) {
    headers[k] = v;
  }
  return headers;
}

// Connect with Streamable HTTP first (the current MCP transport), falling
// back to SSE for older servers — the standard client-compat dance from the
// MCP spec. Returns a connected client the caller MUST close.
async function connect(url: string, auth: UpstreamAuth | null): Promise<Client> {
  const headers = buildHeaders(auth);
  const client = new Client({ name: "prismian-relay", version: "0.1.0" });

  try {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
    });
    await client.connect(transport);
    return client;
  } catch (streamableErr) {
    // Fall back to SSE. A fresh Client is required — a failed connect
    // leaves the old one in an unusable state.
    const sseClient = new Client({ name: "prismian-relay", version: "0.1.0" });
    try {
      const transport = new SSEClientTransport(new URL(url), {
        requestInit: { headers },
        eventSourceInit: {
          fetch: (input, init) =>
            fetch(input, { ...init, headers: { ...headers, Accept: "text/event-stream" } }),
        },
      });
      await sseClient.connect(transport);
      return sseClient;
    } catch {
      // Report the streamable-HTTP error — it's the primary transport and
      // its message (401, DNS failure, etc.) is the actionable one.
      const msg =
        streamableErr instanceof Error
          ? streamableErr.message
          : String(streamableErr);
      throw new McpUpstreamError(
        `Could not connect to MCP server at ${url}: ${msg}`
      );
    }
  }
}

export async function fetchUpstreamTools(
  url: string,
  auth: UpstreamAuth | null
): Promise<McpToolDescriptor[]> {
  const client = await connect(url, auth);
  try {
    const result = await client.listTools(undefined, {
      timeout: LIST_TOOLS_TIMEOUT_MS,
    });
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description ?? null,
      input_schema: (t.inputSchema as Record<string, unknown>) ?? {
        type: "object",
        properties: {},
      },
    }));
  } catch (e) {
    if (e instanceof McpUpstreamError) throw e;
    throw new McpUpstreamError(
      `Connected but failed to list tools: ${e instanceof Error ? e.message : String(e)}`
    );
  } finally {
    await client.close().catch(() => {});
  }
}

export interface RelayCallResult {
  // MCP content blocks from the upstream, passed through verbatim.
  content: unknown[];
  is_error: boolean;
}

export async function callUpstreamTool(
  url: string,
  auth: UpstreamAuth | null,
  toolName: string,
  args: Record<string, unknown>
): Promise<RelayCallResult> {
  const client = await connect(url, auth);
  try {
    const result = await client.callTool(
      { name: toolName, arguments: args },
      undefined,
      { timeout: CALL_TOOL_TIMEOUT_MS }
    );
    return {
      content: (result.content as unknown[]) ?? [],
      is_error: result.isError === true,
    };
  } catch (e) {
    if (e instanceof McpUpstreamError) throw e;
    throw new McpUpstreamError(
      `Tool call '${toolName}' failed upstream: ${e instanceof Error ? e.message : String(e)}`
    );
  } finally {
    await client.close().catch(() => {});
  }
}

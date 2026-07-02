import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api, type McpToolManifestEntry } from "./client.js";
import { jsonSchemaToZodShape } from "./json-schema-to-zod.js";

// Register the workspace's relayed MCP tools (Linear, Sentry, Notion, ...)
// alongside the native Prismian tools. The manifest is already filtered by
// this agent key's permissions server-side — everything we get back is
// callable. Manifest fetch failure is non-fatal: native tools still work,
// so we log and continue rather than refusing to start.

const VALID_TOOL_NAME = /^[a-zA-Z0-9_-]{1,128}$/;

export async function registerRelayedTools(server: McpServer): Promise<void> {
  let tools: McpToolManifestEntry[];
  try {
    ({ tools } = await api.mcpManifest());
  } catch (e) {
    console.error(
      `Prismian: could not load relayed MCP tools (${e instanceof Error ? e.message : e}). ` +
        "Native tools remain available."
    );
    return;
  }

  const seen = new Set<string>();
  for (const tool of tools) {
    // Defensive: skip anything that would collide with native tools or
    // carry a name the MCP spec would reject.
    if (seen.has(tool.namespaced_name)) continue;
    if (!VALID_TOOL_NAME.test(tool.namespaced_name)) {
      console.error(
        `Prismian: skipping relayed tool with invalid name '${tool.namespaced_name}'`
      );
      continue;
    }
    seen.add(tool.namespaced_name);

    const description =
      `[${tool.connector_name}] ${tool.description ?? tool.name}\n\n` +
      `Relayed through Prismian to the team's '${tool.connector_slug}' MCP server. ` +
      "Calls are permission-checked and audit-logged.";

    server.registerTool(
      tool.namespaced_name,
      {
        description,
        inputSchema: jsonSchemaToZodShape(tool.input_schema),
      },
      async (args: Record<string, unknown>) => {
        const result = await api.mcpCall(tool.namespaced_name, args ?? {});
        // Upstream content blocks (text/image/resource) pass through
        // verbatim — Prismian relays, it doesn't reshape.
        return {
          content: result.content as any,
          isError: result.is_error || undefined,
        };
      }
    );
  }

  if (tools.length > 0) {
    console.error(
      `Prismian: registered ${seen.size} relayed tool(s) from the workspace's MCP connectors`
    );
  }
}

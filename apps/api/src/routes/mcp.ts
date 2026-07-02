import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import {
  createMcpConnectorSchema,
  updateMcpConnectorSchema,
  mcpCallSchema,
} from "../shared/index.js";
import type {
  AgentPermissions,
  McpToolDescriptor,
  McpToolManifestEntry,
} from "../shared/index.js";
import type { AppEnv } from "../types.js";
import { encryptConfig, decryptConfig } from "../services/connectors/crypto.js";
import {
  fetchUpstreamTools,
  callUpstreamTool,
  McpUpstreamError,
  type UpstreamAuth,
} from "../services/mcp/relay.js";
import {
  namespacedToolName,
  resolveNamespacedTool,
} from "../services/mcp/naming.js";
import { canCallMcpTool } from "../services/permissions.js";
import { logAction } from "../services/audit.js";

export const mcpRoutes = new Hono<AppEnv>();

mcpRoutes.use("*", authMiddleware);

// Columns safe to return to clients — never encrypted_auth.
const CONNECTOR_COLUMNS = `id, workspace_id, slug, name, url, status,
  last_error, tools, tools_refreshed_at, created_by, created_at, updated_at`;

function packAuth(input: {
  auth_token?: string;
  headers?: Record<string, string>;
}): string | null {
  const auth: UpstreamAuth = {};
  if (input.auth_token) auth.auth_token = input.auth_token;
  if (input.headers && Object.keys(input.headers).length > 0) {
    auth.headers = input.headers;
  }
  if (!auth.auth_token && !auth.headers) return null;
  return encryptConfig(JSON.stringify(auth));
}

function unpackAuth(encrypted: string | null): UpstreamAuth | null {
  if (!encrypted) return null;
  return JSON.parse(decryptConfig(encrypted)) as UpstreamAuth;
}

interface ConnectorRow {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  url: string;
  status: string;
  tools: McpToolDescriptor[] | null;
  encrypted_auth: string | null;
}

// ── Connector administration (humans only) ─────────────────────────────

const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", async (c, next) => {
  const auth = c.get("auth");
  if (auth.agentKeyId) {
    return c.json({ error: "Agent keys cannot manage MCP connectors" }, 403);
  }
  await next();
});

adminRoutes.use(
  "*",
  requireWorkspaceScope([{ table: "mcp_connectors", paramName: "id" }])
);

adminRoutes.get("/", async (c) => {
  const workspaceId = c.req.query("workspace_id");
  if (!workspaceId) {
    return c.json({ error: "workspace_id query param required" }, 400);
  }
  const result = await query(
    `SELECT ${CONNECTOR_COLUMNS} FROM mcp_connectors
     WHERE workspace_id = $1 ORDER BY created_at DESC`,
    [workspaceId]
  );
  return c.json({ connectors: result.rows });
});

adminRoutes.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = createMcpConnectorSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const { workspace_id, name, slug, url, auth_token, headers } = parsed.data;

  const upstreamAuth: UpstreamAuth = { auth_token, headers };

  // Connect and list tools before persisting — fail fast with the upstream
  // error so the modal can show "401 from Linear" instead of storing a
  // broken connector.
  let tools: McpToolDescriptor[];
  try {
    tools = await fetchUpstreamTools(url, upstreamAuth);
  } catch (e) {
    return c.json(
      {
        error: "Could not connect to the MCP server",
        detail: e instanceof Error ? e.message : String(e),
      },
      400
    );
  }

  const encrypted = packAuth({ auth_token, headers });

  let result;
  try {
    result = await query(
      `INSERT INTO mcp_connectors
         (workspace_id, slug, name, url, encrypted_auth, tools, tools_refreshed_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
       RETURNING ${CONNECTOR_COLUMNS}`,
      [
        workspace_id,
        slug,
        name,
        url,
        encrypted,
        JSON.stringify(tools),
        auth.userId || null,
      ]
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return c.json(
        { error: `A connector with slug '${slug}' already exists in this workspace` },
        409
      );
    }
    throw e;
  }

  logAction(auth, workspace_id, "create", "mcp_connector", result.rows[0].id, {
    slug,
    url,
    tool_count: tools.length,
  });

  return c.json({ connector: result.rows[0] }, 201);
});

adminRoutes.put("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateMcpConnectorSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const existing = await query<ConnectorRow>(
    `SELECT id, workspace_id, slug, name, url, status, tools, encrypted_auth
     FROM mcp_connectors WHERE id = $1`,
    [id]
  );
  if (existing.rows.length === 0) {
    return c.json({ error: "Connector not found" }, 404);
  }
  const row = existing.rows[0];
  const { name, url, auth_token, headers, status } = parsed.data;

  // Re-pack credentials only when the caller touched them. `null` clears;
  // absent leaves the stored value alone.
  let encrypted = row.encrypted_auth;
  const credsTouched = auth_token !== undefined || headers !== undefined;
  if (credsTouched) {
    const current = unpackAuth(row.encrypted_auth) ?? {};
    const next = {
      auth_token:
        auth_token === undefined ? current.auth_token : auth_token ?? undefined,
      headers: headers === undefined ? current.headers : headers ?? undefined,
    };
    encrypted = packAuth(next);
  }

  const nextUrl = url ?? row.url;

  // If connectivity-relevant fields changed, re-verify and refresh the
  // tool manifest in the same pass.
  let tools: McpToolDescriptor[] | null = null;
  if (url !== undefined || credsTouched) {
    try {
      tools = await fetchUpstreamTools(nextUrl, unpackAuth(encrypted));
    } catch (e) {
      return c.json(
        {
          error: "Could not connect with the updated settings",
          detail: e instanceof Error ? e.message : String(e),
        },
        400
      );
    }
  }

  const result = await query(
    `UPDATE mcp_connectors SET
       name = COALESCE($2, name),
       url = $3,
       encrypted_auth = $4,
       status = COALESCE($5, status),
       tools = COALESCE($6, tools),
       tools_refreshed_at = CASE WHEN $6::jsonb IS NOT NULL THEN now() ELSE tools_refreshed_at END,
       last_error = CASE WHEN $6::jsonb IS NOT NULL THEN NULL ELSE last_error END,
       updated_at = now()
     WHERE id = $1
     RETURNING ${CONNECTOR_COLUMNS}`,
    [id, name ?? null, nextUrl, encrypted, status ?? null, tools ? JSON.stringify(tools) : null]
  );

  logAction(auth, row.workspace_id, "update", "mcp_connector", id, {
    slug: row.slug,
  });

  return c.json({ connector: result.rows[0] });
});

adminRoutes.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const res = await query<{ workspace_id: string; slug: string }>(
    "SELECT workspace_id, slug FROM mcp_connectors WHERE id = $1",
    [id]
  );
  if (res.rows.length === 0) {
    return c.json({ error: "Connector not found" }, 404);
  }
  await query("DELETE FROM mcp_connectors WHERE id = $1", [id]);
  logAction(auth, res.rows[0].workspace_id, "delete", "mcp_connector", id, {
    slug: res.rows[0].slug,
  });
  return c.json({ message: "Deleted" });
});

adminRoutes.post("/:id/refresh", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const res = await query<ConnectorRow>(
    `SELECT id, workspace_id, slug, name, url, status, tools, encrypted_auth
     FROM mcp_connectors WHERE id = $1`,
    [id]
  );
  if (res.rows.length === 0) {
    return c.json({ error: "Connector not found" }, 404);
  }
  const row = res.rows[0];

  try {
    const tools = await fetchUpstreamTools(row.url, unpackAuth(row.encrypted_auth));
    const updated = await query(
      `UPDATE mcp_connectors SET
         tools = $2, tools_refreshed_at = now(),
         status = 'active', last_error = NULL, updated_at = now()
       WHERE id = $1
       RETURNING ${CONNECTOR_COLUMNS}`,
      [id, JSON.stringify(tools)]
    );
    logAction(auth, row.workspace_id, "refresh", "mcp_connector", id, {
      slug: row.slug,
      tool_count: tools.length,
    });
    return c.json({ connector: updated.rows[0] });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    await query(
      `UPDATE mcp_connectors SET status = 'error', last_error = $2, updated_at = now()
       WHERE id = $1`,
      [id, detail]
    );
    return c.json({ error: "Refresh failed", detail }, 502);
  }
});

mcpRoutes.route("/connectors", adminRoutes);

// ── Manifest + relay (agents and members) ──────────────────────────────

async function loadActiveConnectors(workspaceId: string): Promise<ConnectorRow[]> {
  const result = await query<ConnectorRow>(
    `SELECT id, workspace_id, slug, name, url, status, tools, encrypted_auth
     FROM mcp_connectors
     WHERE workspace_id = $1 AND status = 'active'`,
    [workspaceId]
  );
  return result.rows;
}

// GET /api/v1/mcp/manifest — the namespaced tool list this caller may use.
// prismian-mcp fetches this at startup and registers each entry as a tool.
mcpRoutes.get("/manifest", requireWorkspaceScope(), async (c) => {
  const auth = c.get("auth");
  const workspaceId = auth.workspaceId || c.req.query("workspace_id");
  if (!workspaceId) {
    return c.json({ error: "workspace_id required" }, 400);
  }

  const permissions = auth.permissions as AgentPermissions | undefined;
  const connectors = await loadActiveConnectors(workspaceId);

  const tools: McpToolManifestEntry[] = [];
  for (const connector of connectors) {
    for (const tool of connector.tools ?? []) {
      if (
        permissions &&
        !canCallMcpTool(permissions, connector.slug, tool.name)
      ) {
        continue;
      }
      tools.push({
        namespaced_name: namespacedToolName(connector.slug, tool.name),
        connector_id: connector.id,
        connector_slug: connector.slug,
        connector_name: connector.name,
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      });
    }
  }

  return c.json({ tools });
});

// POST /api/v1/mcp/call — relay one tool call to the upstream server.
mcpRoutes.post("/call", requireWorkspaceScope(), async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = mcpCallSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const { tool, arguments: args } = parsed.data;

  const workspaceId =
    auth.workspaceId ||
    (typeof body.workspace_id === "string" ? body.workspace_id : undefined);
  if (!workspaceId) {
    return c.json({ error: "workspace_id required" }, 400);
  }

  const connectors = await loadActiveConnectors(workspaceId);
  const resolved = resolveNamespacedTool(tool, connectors);
  if (!resolved) {
    return c.json(
      {
        error: `Unknown MCP tool '${tool}'. Call the manifest endpoint (or restart your MCP client) to get the current tool list.`,
      },
      404
    );
  }

  const permissions = auth.permissions as AgentPermissions | undefined;
  if (
    permissions &&
    !canCallMcpTool(permissions, resolved.connector.slug, resolved.toolName)
  ) {
    return c.json(
      { error: `This agent key is not allowed to call '${tool}'` },
      403
    );
  }

  const started = Date.now();
  try {
    const result = await callUpstreamTool(
      resolved.connector.url,
      unpackAuth(resolved.connector.encrypted_auth),
      resolved.toolName,
      args
    );

    logAction(auth, workspaceId, "mcp_call", "mcp_tool", resolved.connector.id, {
      connector: resolved.connector.slug,
      tool: resolved.toolName,
      ok: !result.is_error,
      duration_ms: Date.now() - started,
    });

    return c.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    logAction(auth, workspaceId, "mcp_call", "mcp_tool", resolved.connector.id, {
      connector: resolved.connector.slug,
      tool: resolved.toolName,
      ok: false,
      error: detail.slice(0, 500),
      duration_ms: Date.now() - started,
    });
    const status = e instanceof McpUpstreamError ? 502 : 500;
    return c.json({ error: "Upstream MCP call failed", detail }, status);
  }
});

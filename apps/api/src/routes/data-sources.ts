import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import {
  createDataSourceSchema,
  introspectDataSourceSchema,
} from "../shared/index.js";
import type { AppEnv } from "../types.js";
import { encryptConfig, decryptConfig } from "../services/connectors/crypto.js";
import {
  introspect,
  testConnection,
  ConnectorPrivilegeError,
} from "../services/connectors/postgres.js";
import { runSyncNow } from "../services/connectors/sync.js";
import { logAction } from "../services/audit.js";

// Map common Postgres connection failures to a plain-English hint so the
// modal can show "wrong password" instead of just "password authentication
// failed for user 'teammem_readonly'". The detail is still returned for
// users who want the raw driver message.
function describeConnectionFailure(e: unknown, detail: string): string | null {
  const code = (e as { code?: string }).code;
  const msg = detail.toLowerCase();

  if (code === "28P01" || msg.includes("password authentication failed")) {
    return "Wrong password. Double-check the password you used in CREATE ROLE — it's case-sensitive.";
  }
  if (code === "3D000" || msg.includes("does not exist")) {
    return "Database name in the connection string doesn't exist. On Supabase / Neon / RDS the default DB is named `postgres`.";
  }
  if (code === "ENOTFOUND" || msg.includes("could not translate host name") || msg.includes("getaddrinfo")) {
    return "Hostname not resolvable. Copy the connection string from your provider exactly — for Supabase, use the Session pooler URL.";
  }
  if (code === "ECONNREFUSED" || msg.includes("connection refused")) {
    return "Port is closed or wrong. Supabase's Session pooler uses port 6543, not 5432.";
  }
  if (code === "ETIMEDOUT" || msg.includes("timeout")) {
    return "Connection timed out. Your DB may have an IP allowlist that doesn't include Vercel's egress IPs — switch to Supabase's pooler endpoint, or allow 0.0.0.0/0 for testing.";
  }
  if (msg.includes("ssl") || msg.includes("tls")) {
    return "SSL handshake failed. Append `?sslmode=require` to the connection string.";
  }
  if (code === "28000" || msg.includes("no pg_hba.conf entry")) {
    return "Server rejected the connection (pg_hba.conf). The role may not have permission to connect from this network, or SSL is required — try appending `?sslmode=require`.";
  }
  return null;
}

export const dataSourceRoutes = new Hono<AppEnv>();

dataSourceRoutes.use("*", authMiddleware);

// Agent keys never touch data source administration — it's a human-only
// concern. Reject any agent-authenticated request outright.
dataSourceRoutes.use("*", async (c, next) => {
  const auth = c.get("auth");
  if (auth.agentKeyId) {
    return c.json(
      { error: "Agent keys cannot manage data sources" },
      403
    );
  }
  await next();
});

// Scope every data-source route to a workspace the caller belongs to. Resolve
// either from query/body workspace_id, or from the target resource's row.
dataSourceRoutes.use(
  "*",
  requireWorkspaceScope([
    { table: "data_sources", paramName: "id" },
    { table: "collections", paramName: "collectionId" },
  ])
);

dataSourceRoutes.get("/", async (c) => {
  const workspaceId = c.req.query("workspace_id");
  if (!workspaceId) {
    return c.json({ error: "workspace_id query param required" }, 400);
  }
  const result = await query(
    `SELECT id, workspace_id, name, source_type, status,
            last_sync_at, last_sync_error, created_by, created_at, updated_at
     FROM data_sources
     WHERE workspace_id = $1
     ORDER BY created_at DESC`,
    [workspaceId]
  );
  return c.json({ data_sources: result.rows });
});

dataSourceRoutes.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return c.json({ error: "workspace_id required" }, 400);
  }
  const parsed = createDataSourceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  // Test the connection before persisting. Fail fast with a useful error.
  try {
    await testConnection(parsed.data.connection_string);
  } catch (e) {
    if (e instanceof ConnectorPrivilegeError) {
      return c.json(
        {
          error: "Connection refused: supplied role has too many privileges.",
          code: e.code,
          detail: e.message,
          privileges: e.privileges,
        },
        400
      );
    }
    const detail = e instanceof Error ? e.message : String(e);
    const hint = describeConnectionFailure(e, detail);
    return c.json(
      {
        error: "Connection test failed",
        detail,
        hint,
      },
      400
    );
  }

  const encrypted = encryptConfig(parsed.data.connection_string);

  const result = await query(
    `INSERT INTO data_sources
       (workspace_id, name, source_type, encrypted_config, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, workspace_id, name, source_type, status,
               last_sync_at, last_sync_error, created_by, created_at, updated_at`,
    [
      workspaceId,
      parsed.data.name,
      parsed.data.source_type,
      encrypted,
      auth.userId || null,
    ]
  );

  logAction(auth, workspaceId, "create", "data_source", result.rows[0].id, {
    source_type: parsed.data.source_type,
  });

  return c.json({ data_source: result.rows[0] }, 201);
});

dataSourceRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await query(
    `SELECT id, workspace_id, name, source_type, status,
            last_sync_at, last_sync_error, created_by, created_at, updated_at
     FROM data_sources
     WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return c.json({ error: "Data source not found" }, 404);
  }
  return c.json({ data_source: result.rows[0] });
});

dataSourceRoutes.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const res = await query<{ workspace_id: string }>(
    "SELECT workspace_id FROM data_sources WHERE id = $1",
    [id]
  );
  if (res.rows.length === 0) {
    return c.json({ error: "Data source not found" }, 404);
  }
  await query("DELETE FROM data_sources WHERE id = $1", [id]);
  logAction(auth, res.rows[0].workspace_id, "delete", "data_source", id);
  return c.json({ message: "Deleted" });
});

dataSourceRoutes.post("/:id/introspect", async (c) => {
  const id = c.req.param("id");
  const parsed = introspectDataSourceSchema.safeParse({ data_source_id: id });
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const res = await query<{ encrypted_config: string }>(
    "SELECT encrypted_config FROM data_sources WHERE id = $1",
    [id]
  );
  if (res.rows.length === 0) {
    return c.json({ error: "Data source not found" }, 404);
  }

  try {
    const connectionString = decryptConfig(res.rows[0].encrypted_config);
    const tables = await introspect(connectionString);
    return c.json({ tables });
  } catch (e) {
    if (e instanceof ConnectorPrivilegeError) {
      return c.json(
        {
          error: "Introspection refused: supplied role has too many privileges.",
          code: e.code,
          detail: e.message,
          privileges: e.privileges,
        },
        400
      );
    }
    return c.json(
      {
        error: "Introspection failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

dataSourceRoutes.post("/collections/:collectionId/sync", async (c) => {
  const collectionId = c.req.param("collectionId");
  const outcome = await runSyncNow(collectionId);
  if (outcome.status === "not_connected") {
    return c.json({ error: "Collection is not a connected collection" }, 400);
  }
  return c.json({ sync: outcome });
});

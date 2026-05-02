import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware, hashApiKey, generateApiKey } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import {
  createAgentKeySchema,
  updateAgentKeySchema,
} from "../shared/index.js";
import type { AppEnv } from "../types.js";
import { notify } from "../services/notify.js";

export const agentKeyRoutes = new Hono<AppEnv>();

agentKeyRoutes.use("*", authMiddleware);
agentKeyRoutes.use(
  "*",
  requireWorkspaceScope([{ table: "agent_keys", paramName: "id" }])
);

agentKeyRoutes.get("/", async (c) => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json(
      { error: "Listing agent keys requires a user session" },
      403
    );
  }
  const workspaceId = c.req.query("workspace_id");
  if (!workspaceId) {
    return c.json({ error: "workspace_id query param required" }, 400);
  }

  const result = await query(
    `SELECT id, workspace_id, created_by, name, permissions,
            last_used_at, last_four, created_at
     FROM agent_keys
     WHERE workspace_id = $1
     ORDER BY created_at DESC`,
    [workspaceId]
  );

  return c.json({ agent_keys: result.rows });
});

agentKeyRoutes.post("/", async (c) => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json({ error: "User session required to create agent keys" }, 400);
  }

  const body = await c.req.json();
  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return c.json({ error: "workspace_id required" }, 400);
  }

  const parsed = createAgentKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const lastFour = rawKey.slice(-4);

  // Check whether this is the first key in the workspace BEFORE we insert,
  // so the notify event fires exactly once (on the first key).
  const existing = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM agent_keys WHERE workspace_id = $1`,
    [workspaceId]
  );
  const isFirstKey = existing.rows[0]?.count === "0";

  const result = await query(
    `INSERT INTO agent_keys
       (workspace_id, created_by, name, key_hash, permissions, last_four)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, workspace_id, created_by, name, permissions,
               last_four, created_at`,
    [
      workspaceId,
      auth.userId,
      parsed.data.name,
      keyHash,
      parsed.data.permissions,
      lastFour,
    ]
  );

  if (isFirstKey) {
    const ctx = await query<{ workspace_name: string; user_email: string | null }>(
      `SELECT w.name AS workspace_name, u.email AS user_email
       FROM workspaces w
       LEFT JOIN users u ON u.id = $2
       WHERE w.id = $1`,
      [workspaceId, auth.userId]
    );
    await notify({
      kind: "generate_first_key",
      userEmail: ctx.rows[0]?.user_email || "(unknown)",
      workspaceId,
      workspaceName: ctx.rows[0]?.workspace_name || "(unknown)",
      keyName: parsed.data.name,
    });
  }

  return c.json(
    {
      agent_key: result.rows[0],
      raw_key: rawKey,
      note: "Save this key — it won't be shown again.",
    },
    201
  );
});

agentKeyRoutes.put("/:id", async (c) => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json({ error: "User session required to edit agent keys" }, 400);
  }

  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateAgentKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  // Build a dynamic SET clause from whichever fields were provided.
  // We never touch key_hash or last_four — rotating the secret is a
  // separate operation (revoke + recreate). This is intentional.
  const sets: string[] = [];
  const params: unknown[] = [];
  if (parsed.data.name !== undefined) {
    params.push(parsed.data.name);
    sets.push(`name = $${params.length}`);
  }
  if (parsed.data.permissions !== undefined) {
    params.push(parsed.data.permissions);
    sets.push(`permissions = $${params.length}`);
  }
  params.push(id);

  const result = await query(
    `UPDATE agent_keys
       SET ${sets.join(", ")}
     WHERE id = $${params.length}
     RETURNING id, workspace_id, created_by, name, permissions,
               last_used_at, last_four, created_at`,
    params
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Agent key not found" }, 404);
  }

  return c.json({ agent_key: result.rows[0] });
});

agentKeyRoutes.delete("/:id", async (c) => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json(
      { error: "Revoking agent keys requires a user session" },
      403
    );
  }
  const id = c.req.param("id");
  await query("DELETE FROM agent_keys WHERE id = $1", [id]);
  return c.json({ message: "Deleted" });
});

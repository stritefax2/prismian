import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware, hashApiKey, generateApiKey } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import { createAgentKeySchema } from "@teammem/shared";
import type { AppEnv } from "../types.js";

export const agentKeyRoutes = new Hono<AppEnv>();

agentKeyRoutes.use("*", authMiddleware);
agentKeyRoutes.use(
  "*",
  requireWorkspaceScope([{ table: "agent_keys", paramName: "id" }])
);

agentKeyRoutes.get("/", async (c) => {
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

  return c.json(
    {
      agent_key: result.rows[0],
      raw_key: rawKey,
      note: "Save this key — it won't be shown again.",
    },
    201
  );
});

agentKeyRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await query("DELETE FROM agent_keys WHERE id = $1", [id]);
  return c.json({ message: "Deleted" });
});

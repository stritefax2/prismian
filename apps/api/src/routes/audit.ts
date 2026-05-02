import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware, requireHumanWorkspaceMember } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.use("*", authMiddleware);

auditRoutes.get("/:workspaceId", requireHumanWorkspaceMember, async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
  const offset = Number(c.req.query("offset")) || 0;

  const result = await query(
    `SELECT a.*,
            u.name AS user_name, u.email AS user_email,
            ak.name AS agent_name
     FROM audit_log a
     LEFT JOIN users u ON a.actor_type = 'user' AND a.actor_id = u.id
     LEFT JOIN agent_keys ak ON a.actor_type = 'agent' AND a.actor_id = ak.id
     WHERE a.workspace_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset]
  );

  return c.json({ events: result.rows });
});

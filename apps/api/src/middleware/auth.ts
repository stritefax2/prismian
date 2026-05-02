import { createMiddleware } from "hono/factory";
import { query } from "../db/client.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { notify } from "../services/notify.js";
import crypto from "node:crypto";

export interface AuthContext {
  userId?: string;
  agentKeyId?: string;
  workspaceId?: string;
  permissions?: Record<string, unknown>;
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return `pr_sk_${crypto.randomBytes(32).toString("hex")}`;
}

export const authMiddleware = createMiddleware<{
  Variables: { auth: AuthContext };
}>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) {
    return c.json({ error: "Authorization header required" }, 401);
  }

  const token = header.replace("Bearer ", "");

  // Agent API key
  if (token.startsWith("pr_sk_")) {
    const keyHash = hashApiKey(token);
    const result = await query(
      `UPDATE agent_keys SET last_used_at = now()
       WHERE key_hash = $1
       RETURNING id, workspace_id, permissions`,
      [keyHash]
    );
    if (result.rows.length === 0) {
      return c.json({ error: "Invalid API key" }, 401);
    }
    const row = result.rows[0];
    c.set("auth", {
      agentKeyId: row.id,
      workspaceId: row.workspace_id,
      permissions: row.permissions,
    });
    await next();
    return;
  }

  // Supabase JWT
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Ensure user exists in our users table (upsert on first API call).
  // `xmax = 0` is the canonical Postgres trick for "this row was an INSERT,
  // not an UPDATE-on-conflict" — we use it to fire the signup notification
  // exactly once, on the user's first authenticated API call.
  const upsertResult = await query<{ inserted: boolean }>(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = $2, name = COALESCE($3, users.name)
     RETURNING (xmax = 0) AS inserted`,
    [user.id, user.email, user.user_metadata?.name || null]
  );
  if (upsertResult.rows[0]?.inserted) {
    await notify({
      kind: "register",
      email: user.email || "(no email)",
      name: user.user_metadata?.name || null,
    });
  }

  c.set("auth", { userId: user.id });
  await next();
});

export const requireWorkspaceMember = createMiddleware<{
  Variables: { auth: AuthContext };
}>(async (c, next) => {
  const auth = c.get("auth");
  const workspaceId =
    c.req.param("workspaceId") || c.req.param("id") || auth.workspaceId;

  if (!workspaceId) {
    return c.json({ error: "Workspace ID required" }, 400);
  }

  if (auth.agentKeyId) {
    if (auth.workspaceId !== workspaceId) {
      return c.json({ error: "Agent key not authorized for this workspace" }, 403);
    }
    await next();
    return;
  }

  if (auth.userId) {
    const result = await query(
      "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL",
      [workspaceId, auth.userId]
    );
    if (result.rows.length === 0) {
      return c.json({ error: "Not a member of this workspace" }, 403);
    }
    await next();
    return;
  }

  return c.json({ error: "Unauthorized" }, 401);
});

// Like requireWorkspaceMember, but rejects agent keys outright. Use this on
// any human-only route: invites, member listing, audit log, agent-key
// management, workspace/collection lifecycle. Agent keys are scoped tools
// for entry-level reads/writes — they should never be able to manage the
// workspace itself or read who's in it.
export const requireHumanWorkspaceMember = createMiddleware<{
  Variables: { auth: AuthContext; memberRole?: string };
}>(async (c, next) => {
  const auth = c.get("auth");

  if (auth.agentKeyId) {
    return c.json(
      { error: "This endpoint requires a user session, not an agent key" },
      403
    );
  }

  if (!auth.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const workspaceId =
    c.req.param("workspaceId") || c.req.param("id") || c.req.query("workspace_id");

  if (!workspaceId) {
    return c.json({ error: "Workspace ID required" }, 400);
  }

  const result = await query<{ role: string }>(
    "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL",
    [workspaceId, auth.userId]
  );
  if (result.rows.length === 0) {
    return c.json({ error: "Not a member of this workspace" }, 403);
  }

  c.set("memberRole", result.rows[0].role);
  await next();
});

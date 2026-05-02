import { Hono } from "hono";
import { query, transaction } from "../db/client.js";
import {
  authMiddleware,
  requireWorkspaceMember,
  requireHumanWorkspaceMember,
} from "../middleware/auth.js";
import { createWorkspaceSchema, inviteMemberSchema } from "../shared/index.js";
import { supabaseAdmin } from "../lib/supabase.js";
import type { AppEnv } from "../types.js";

export const workspaceRoutes = new Hono<AppEnv>();

workspaceRoutes.use("*", authMiddleware);

workspaceRoutes.get("/", async (c) => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json({ error: "User session required" }, 400);
  }

  const result = await query(
    `SELECT w.* FROM workspaces w
     INNER JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = $1 AND wm.accepted_at IS NOT NULL
     ORDER BY w.created_at DESC`,
    [auth.userId]
  );

  return c.json({ workspaces: result.rows });
});

workspaceRoutes.post("/", async (c) => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json({ error: "User session required" }, 400);
  }

  const body = await c.req.json();
  const parsed = createWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const workspace = await transaction(async (client) => {
    const ws = await client.query(
      "INSERT INTO workspaces (name, created_by, settings) VALUES ($1, $2, $3) RETURNING *",
      [parsed.data.name, auth.userId, parsed.data.settings || {}]
    );
    await client.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at) VALUES ($1, $2, 'owner', now())",
      [ws.rows[0].id, auth.userId]
    );
    return ws.rows[0];
  });

  return c.json({ workspace }, 201);
});

workspaceRoutes.get("/:id", requireWorkspaceMember, async (c) => {
  const id = c.req.param("id");
  const result = await query("SELECT * FROM workspaces WHERE id = $1", [id]);

  if (result.rows.length === 0) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  return c.json({ workspace: result.rows[0] });
});

// Delete a workspace and everything attached to it. Owner-only — editors
// and viewers can't take down a shared workspace. Requires the caller to
// confirm by re-typing the workspace name in `confirm_name`, which prevents
// fat-finger destruction. All child rows cascade via FK ON DELETE CASCADE.
workspaceRoutes.delete("/:id", requireHumanWorkspaceMember, async (c) => {
  const id = c.req.param("id");
  const role = c.get("memberRole");
  if (role !== "owner") {
    return c.json(
      { error: "Only workspace owners can delete the workspace" },
      403
    );
  }

  const wsResult = await query<{ name: string }>(
    "SELECT name FROM workspaces WHERE id = $1",
    [id]
  );
  if (wsResult.rows.length === 0) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
  const confirmName = typeof body.confirm_name === "string" ? body.confirm_name : "";
  if (confirmName !== wsResult.rows[0].name) {
    return c.json(
      {
        error:
          "Type the workspace name exactly to confirm deletion.",
        code: "confirm_name_required",
      },
      400
    );
  }

  await query("DELETE FROM workspaces WHERE id = $1", [id]);
  return c.json({ message: "Workspace deleted" });
});

workspaceRoutes.get("/:id/members", requireHumanWorkspaceMember, async (c) => {
  const id = c.req.param("id");
  const result = await query(
    `SELECT u.id, u.email, u.name, wm.role, wm.invited_at, wm.accepted_at
     FROM workspace_members wm
     INNER JOIN users u ON wm.user_id = u.id
     WHERE wm.workspace_id = $1
     ORDER BY wm.invited_at`,
    [id]
  );

  // Also get pending invites (users who haven't registered yet)
  const pendingResult = await query(
    `SELECT id, email, role, invited_at FROM workspace_invites
     WHERE workspace_id = $1 AND accepted_at IS NULL
     ORDER BY invited_at`,
    [id]
  );

  return c.json({
    members: result.rows,
    pending_invites: pendingResult.rows,
  });
});

workspaceRoutes.post("/:id/invite", requireHumanWorkspaceMember, async (c) => {
  const workspaceId = c.req.param("id");
  const body = await c.req.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const email = parsed.data.email;
  const role = parsed.data.role;

  // Only owners can grant the owner role. Without this check, any member
  // could escalate themselves (or a colluding account) by inviting a new
  // owner. requireHumanWorkspaceMember has already populated memberRole.
  if (role === "owner" && c.get("memberRole") !== "owner") {
    return c.json(
      { error: "Only workspace owners can invite new owners" },
      403
    );
  }

  // Check if already a member
  const existingUser = await query("SELECT id FROM users WHERE email = $1", [email]);

  if (existingUser.rows.length > 0) {
    const userId = existingUser.rows[0].id;
    const existingMember = await query(
      "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, userId]
    );
    if (existingMember.rows.length > 0) {
      return c.json({ error: "User is already a member" }, 409);
    }

    // User exists — add directly
    await query(
      "INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at) VALUES ($1, $2, $3, now())",
      [workspaceId, userId, role]
    );
    return c.json({ message: "Member added", status: "added" }, 201);
  }

  // User doesn't exist — send Supabase invite email + store pending invite
  try {
    // Check if already invited
    const existingInvite = await query(
      "SELECT 1 FROM workspace_invites WHERE workspace_id = $1 AND email = $2 AND accepted_at IS NULL",
      [workspaceId, email]
    );
    if (existingInvite.rows.length > 0) {
      return c.json({ error: "Invite already pending for this email" }, 409);
    }

    // Get workspace name for the invite email
    const wsResult = await query("SELECT name FROM workspaces WHERE id = $1", [workspaceId]);
    const workspaceName = wsResult.rows[0]?.name || "a workspace";

    // Invite via Supabase Auth (sends email automatically)
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        invited_role: role,
      },
      redirectTo: `${process.env.WEB_URL || "http://localhost:5173"}/invite/accept?workspace=${workspaceId}`,
    });

    if (inviteError) {
      // If Supabase can't send email (e.g. email not configured), still store the invite
      console.error("Supabase invite email failed:", inviteError.message);
    }

    // Store the pending invite
    await query(
      "INSERT INTO workspace_invites (workspace_id, email, role, invited_by) VALUES ($1, $2, $3, $4)",
      [workspaceId, email, role, c.get("auth").userId]
    );

    return c.json({
      message: inviteError
        ? "Invite saved. Share the registration link with them manually."
        : "Invite email sent",
      status: "invited",
    }, 201);
  } catch (e: any) {
    if (e.code === "23505") {
      return c.json({ error: "Invite already pending for this email" }, 409);
    }
    throw e;
  }
});

// Seed a workspace with a fake "demo_customers" collection so evaluators
// can try the product — create a scoped key, deny a PII-ish column, ask
// Claude — without connecting a real database first. Deliberately native
// (not source-backed) so there's nothing external to configure.
const DEMO_COLLECTION_NAME = "demo_customers";
const DEMO_ROWS = [
  { name: "Ana Silva", email: "ana@northwind.io", company: "Northwind", plan: "enterprise", status: "at_risk", arr: 186000, ssn_fake: "123-45-6781", notes: "Flagged pricing at last QBR" },
  { name: "Jordan Park", email: "jordan@acme.co", company: "Acme", plan: "team", status: "active", arr: 48000, ssn_fake: "123-45-6782", notes: "Upsell candidate" },
  { name: "Sam Carter", email: "sam@contoso.com", company: "Contoso", plan: "enterprise", status: "at_risk", arr: 210000, ssn_fake: "123-45-6783", notes: "Requested tiered pricing" },
  { name: "Priya Rao", email: "priya@initech.io", company: "Initech", plan: "team", status: "churned", arr: 0, ssn_fake: "123-45-6784", notes: "Lost to competitor Q1" },
  { name: "Leo Moreno", email: "leo@globex.com", company: "Globex", plan: "solo", status: "active", arr: 1200, ssn_fake: "123-45-6785", notes: "Low touch" },
  { name: "Maya Chen", email: "maya@umbrella.io", company: "Umbrella", plan: "enterprise", status: "active", arr: 320000, ssn_fake: "123-45-6786", notes: "Expansion Q3 likely" },
  { name: "Dev Patel", email: "dev@stark.com", company: "Stark Industries", plan: "enterprise", status: "active", arr: 415000, ssn_fake: "123-45-6787", notes: "Top account" },
  { name: "Riley Nguyen", email: "riley@oscorp.com", company: "Oscorp", plan: "team", status: "at_risk", arr: 72000, ssn_fake: "123-45-6788", notes: "Renewal flagged" },
  { name: "Noah Weiss", email: "noah@wayne.co", company: "Wayne Enterprises", plan: "enterprise", status: "active", arr: 198000, ssn_fake: "123-45-6789", notes: "Champion changed last month" },
  { name: "Isla Martinez", email: "isla@hooli.io", company: "Hooli", plan: "team", status: "active", arr: 60000, ssn_fake: "123-45-6790", notes: "Steady usage" },
  { name: "Finn O'Connor", email: "finn@pied-piper.com", company: "Pied Piper", plan: "solo", status: "churned", arr: 0, ssn_fake: "123-45-6791", notes: "Moved to free tier competitor" },
  { name: "Aya Tanaka", email: "aya@massive-dynamic.com", company: "Massive Dynamic", plan: "enterprise", status: "active", arr: 275000, ssn_fake: "123-45-6792", notes: "Strategic account, exec sponsor" },
  { name: "Ben Ortiz", email: "ben@vandelay.com", company: "Vandelay", plan: "team", status: "at_risk", arr: 55000, ssn_fake: "123-45-6793", notes: "Support load high, watch" },
  { name: "Zara Ahmed", email: "zara@tyrell.co", company: "Tyrell", plan: "enterprise", status: "active", arr: 240000, ssn_fake: "123-45-6794", notes: "NPS 9, reference candidate" },
  { name: "Oliver Reed", email: "oliver@cyberdyne.ai", company: "Cyberdyne", plan: "solo", status: "active", arr: 480, ssn_fake: "123-45-6795", notes: "Prosumer, possible referrer" },
];

workspaceRoutes.post("/:id/seed-demo", requireHumanWorkspaceMember, async (c) => {
  const workspaceId = c.req.param("id");

  const existing = await query<{ id: string }>(
    "SELECT id FROM collections WHERE workspace_id = $1 AND name = $2",
    [workspaceId, DEMO_COLLECTION_NAME]
  );
  if (existing.rows.length > 0) {
    return c.json(
      {
        collection_id: existing.rows[0].id,
        message: "Demo collection already exists",
        already_seeded: true,
      },
      200
    );
  }

  const created = await transaction(async (client) => {
    const col = await client.query<{ id: string }>(
      `INSERT INTO collections (workspace_id, name, collection_type)
       VALUES ($1, $2, 'structured')
       RETURNING id`,
      [workspaceId, DEMO_COLLECTION_NAME]
    );
    const collectionId = col.rows[0].id;

    const auth = c.get("auth");
    for (const row of DEMO_ROWS) {
      const entry = await client.query<{ id: string }>(
        `INSERT INTO entries (collection_id, workspace_id, structured_data, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [collectionId, workspaceId, row, auth.userId || null]
      );
      await client.query(
        `INSERT INTO entry_versions (entry_id, version, structured_data, changed_by, change_type)
         VALUES ($1, 1, $2, $3, 'create')`,
        [entry.rows[0].id, row, auth.userId || null]
      );
    }

    return { collectionId };
  });

  return c.json(
    {
      collection_id: created.collectionId,
      rows_inserted: DEMO_ROWS.length,
      suggested_redactions: ["ssn_fake", "arr"],
      message:
        "Demo collection seeded. Create a scoped agent key that denies " +
        "ssn_fake, paste the MCP config into Cursor or Claude, and ask a " +
        "question about these customers.",
    },
    201
  );
});

// Accept a pending invite (called after user registers via invite link)
workspaceRoutes.post("/:id/accept-invite", authMiddleware, async (c) => {
  const workspaceId = c.req.param("id");
  const auth = c.get("auth");
  if (!auth.userId) {
    return c.json({ error: "User session required" }, 400);
  }

  const userResult = await query("SELECT email FROM users WHERE id = $1", [auth.userId]);
  if (userResult.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  const email = userResult.rows[0].email;

  const invite = await query(
    "SELECT role FROM workspace_invites WHERE workspace_id = $1 AND email = $2 AND accepted_at IS NULL",
    [workspaceId, email]
  );

  if (invite.rows.length === 0) {
    return c.json({ error: "No pending invite found" }, 404);
  }

  await transaction(async (client) => {
    await client.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING",
      [workspaceId, auth.userId, invite.rows[0].role]
    );
    await client.query(
      "UPDATE workspace_invites SET accepted_at = now() WHERE workspace_id = $1 AND email = $2",
      [workspaceId, email]
    );
  });

  return c.json({ message: "Invite accepted" });
});

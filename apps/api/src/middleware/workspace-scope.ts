import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { query } from "../db/client.js";
import type { AuthContext } from "./auth.js";

// Verifies the caller is a member of (or agent-keyed into) the workspace
// being acted on. Supports multiple resolution strategies:
//   - ?workspace_id=<uuid> query param (used by list/create endpoints)
//   - body.workspace_id or body.collection_id (used by some POST endpoints)
//   - {table, paramName, column?} — resolve workspace_id by reading a
//     related resource via a URL parameter
//
// Agent keys are workspace-bound at auth time, so we just confirm the
// resolved workspace_id matches the agent key's workspace_id.

export interface Resolver {
  table: string;
  paramName: string;
  column?: string;
}

const UUID_RE =
  /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

const BARE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Live-collection rows have synthetic ids: live_<collectionUuid>_<sourcePk>.
// They resolve to a workspace via the embedded collection, not the entries
// table (they have no entries row by design).
const LIVE_ID_RE =
  /^live_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_.+$/i;

function firstUuidInPath(path: string): string | undefined {
  const match = path.match(UUID_RE);
  return match ? match[1] : undefined;
}

function liveIdInPath(path: string): string | undefined {
  const match = path.match(
    /\/(live_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[^/]+)(?:\/|$)/i
  );
  return match ? match[1] : undefined;
}

async function resolveWorkspaceId(
  c: Context,
  resolvers: Resolver[] | undefined
): Promise<string | undefined> {
  const queryWs = c.req.query("workspace_id");
  if (queryWs) return queryWs;

  if (resolvers) {
    // Try each resolver. `c.req.param(name)` may be undefined inside
    // middleware attached with `use("*", ...)` because Hono binds params
    // at handler time, not middleware time. Fall back to extracting the
    // first UUID from the URL path — works for both /collections/:id
    // and /collections/:id/entries shapes.
    const pathUuid = firstUuidInPath(c.req.path);
    const pathLiveId = liveIdInPath(c.req.path);
    for (const r of resolvers) {
      const val = c.req.param(r.paramName) ?? pathLiveId ?? pathUuid;
      if (!val) continue;
      const liveMatch = val.match(LIVE_ID_RE);
      if (liveMatch) {
        const res = await query<{ workspace_id: string }>(
          "SELECT workspace_id FROM collections WHERE id = $1",
          [liveMatch[1]]
        );
        if (res.rows.length > 0) return res.rows[0].workspace_id;
        continue;
      }
      // Guard against non-UUID params reaching a uuid-typed column —
      // Postgres would throw (invalid input syntax) and 500 the request.
      if (!BARE_UUID_RE.test(val)) continue;
      const res = await query<{ workspace_id: string }>(
        `SELECT workspace_id FROM ${r.table} WHERE ${r.column ?? "id"} = $1`,
        [val]
      );
      if (res.rows.length > 0) return res.rows[0].workspace_id;
    }
  }

  // Body inspection — only for methods that can carry a body. GET/HEAD
  // requests have no body; trying to parse one throws and wastes cycles.
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const body = (await c.req.raw.clone().json()) as Record<string, unknown>;
      if (body && typeof body === "object") {
        if (typeof body.workspace_id === "string") {
          return body.workspace_id;
        }
        if (typeof body.collection_id === "string") {
          const res = await query<{ workspace_id: string }>(
            "SELECT workspace_id FROM collections WHERE id = $1",
            [body.collection_id]
          );
          if (res.rows.length > 0) return res.rows[0].workspace_id;
        }
      }
    } catch {
      // Not JSON or not parseable — skip.
    }
  }

  return undefined;
}

export function requireWorkspaceScope(resolvers?: Resolver[]) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(
    async (c, next) => {
      const auth = c.get("auth");

      // Agent keys are workspace-bound at auth time. Resolve from request
      // only to catch the case where the caller explicitly references a
      // different workspace (bug or attempted privilege escalation).
      if (auth.agentKeyId) {
        const requested = await resolveWorkspaceId(c, resolvers);
        if (requested && requested !== auth.workspaceId) {
          return c.json(
            { error: "Agent key not authorized for this workspace" },
            403
          );
        }
        await next();
        return;
      }

      if (!auth.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspaceId = await resolveWorkspaceId(c, resolvers);
      if (!workspaceId) {
        return c.json({ error: "workspace_id required" }, 400);
      }

      const member = await query(
        `SELECT role FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL`,
        [workspaceId, auth.userId]
      );
      if (member.rows.length === 0) {
        return c.json({ error: "Not a member of this workspace" }, 403);
      }
      await next();
    }
  );
}

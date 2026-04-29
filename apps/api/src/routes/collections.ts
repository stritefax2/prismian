import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import { createCollectionSchema } from "../shared/index.js";
import type { AgentPermissions } from "../shared/index.js";
import type { AppEnv } from "../types.js";
import { runSyncNow } from "../services/connectors/sync.js";
import {
  canAccessCollection,
  filterDeniedFields,
} from "../services/permissions.js";

export const collectionRoutes = new Hono<AppEnv>();

collectionRoutes.use("*", authMiddleware);
collectionRoutes.use(
  "*",
  requireWorkspaceScope([{ table: "collections", paramName: "id" }])
);

const COLLECTION_COLUMNS = `c.id, c.workspace_id, c.name, c.collection_type,
                            c.schema, c.source_id, c.source_config,
                            c.sync_status, c.last_sync_at, c.last_sync_error,
                            c.created_at`;

collectionRoutes.get("/", async (c) => {
  const workspaceId = c.req.query("workspace_id");
  if (!workspaceId) {
    return c.json({ error: "workspace_id query param required" }, 400);
  }

  const result = await query(
    `SELECT ${COLLECTION_COLUMNS}, COUNT(e.id)::int AS entry_count
     FROM collections c
     LEFT JOIN entries e ON e.collection_id = c.id
     WHERE c.workspace_id = $1
     GROUP BY c.id
     ORDER BY c.created_at`,
    [workspaceId]
  );

  // Agent keys only see collections they have at least read access to.
  // Human workspace members see everything.
  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;
  const collections = permissions
    ? result.rows.filter((c) =>
        canAccessCollection(permissions, c.name, "read")
      )
    : result.rows;

  return c.json({ collections });
});

collectionRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const workspaceId = body.workspace_id;

  if (!workspaceId) {
    return c.json({ error: "workspace_id required" }, 400);
  }

  const parsed = createCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  // If a source is attached, verify it belongs to this workspace.
  if (parsed.data.source_id) {
    const sourceCheck = await query(
      "SELECT id FROM data_sources WHERE id = $1 AND workspace_id = $2",
      [parsed.data.source_id, workspaceId]
    );
    if (sourceCheck.rows.length === 0) {
      return c.json(
        { error: "Data source not found in this workspace" },
        400
      );
    }
  }

  const result = await query(
    `INSERT INTO collections
       (workspace_id, name, collection_type, schema, source_id, source_config, sync_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLLECTION_COLUMNS.replace(/c\./g, "")}`,
    [
      workspaceId,
      parsed.data.name,
      parsed.data.collection_type,
      parsed.data.schema || null,
      parsed.data.source_id || null,
      parsed.data.source_config || null,
      parsed.data.source_id ? "idle" : null,
    ]
  );

  const collection = result.rows[0];

  // Run the initial sync inline. On serverless (Vercel), fire-and-forget
  // promises after the response are killed by the runtime — claim() flips
  // sync_status='syncing' but finalize() never runs, leaving the collection
  // stuck. Awaiting here keeps the function alive through finalize().
  // The trade is a slower POST (a few seconds for typical tables, up to ~30s
  // for the 10k-row cap) — acceptable, since the alternative is a stuck UI.
  if (collection.source_id) {
    try {
      const outcome = await runSyncNow(collection.id);
      if (outcome.status === "error") {
        // The sync recorded its own error in last_sync_error already; the
        // collection still exists, so we hand it back with a hint instead
        // of failing the whole request.
        return c.json(
          {
            collection,
            initial_sync: { status: "error", error: outcome.error },
          },
          201
        );
      }
      if (outcome.status === "ok") {
        return c.json(
          {
            collection,
            initial_sync: {
              status: "ok",
              rows_synced: outcome.rows_synced,
              truncated: outcome.truncated,
            },
          },
          201
        );
      }
    } catch (e) {
      console.error(`Initial sync failed for ${collection.id}:`, e);
      // Even on a thrown error, the collection row exists. Return it with
      // an error hint so the UI can offer a retry rather than 500-ing.
      return c.json(
        {
          collection,
          initial_sync: {
            status: "error",
            error:
              e instanceof Error ? e.message : "Initial sync failed",
          },
        },
        201
      );
    }
  }

  return c.json({ collection }, 201);
});

collectionRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await query(
    `SELECT ${COLLECTION_COLUMNS.replace(/c\./g, "")}
     FROM collections
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }

  const collection = result.rows[0];
  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;
  if (permissions && !canAccessCollection(permissions, collection.name, "read")) {
    return c.json({ error: "Access denied to this collection" }, 403);
  }

  return c.json({ collection });
});

collectionRoutes.get("/:id/entries", async (c) => {
  const collectionId = c.req.param("id");
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;
  const q = c.req.query("q")?.trim() || "";
  const sortByRaw = c.req.query("sort_by")?.trim() || "updated_at";
  const sortDir = c.req.query("sort_dir") === "asc" ? "ASC" : "DESC";

  // Per-key collection access and field redaction must be enforced here.
  // requireWorkspaceScope only confirms workspace membership; it does not
  // consult permissions.collection_access or permissions.field_restrictions.
  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;

  const collectionResult = await query<{ name: string }>(
    "SELECT name FROM collections WHERE id = $1",
    [collectionId]
  );
  if (collectionResult.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }
  const collectionName = collectionResult.rows[0].name;

  if (permissions && !canAccessCollection(permissions, collectionName, "read")) {
    return c.json({ error: "Access denied to this collection" }, 403);
  }

  // Build dynamic WHERE / ORDER clauses. Field names are validated against
  // a strict regex so we can interpolate them safely into ORDER BY (which
  // doesn't accept parameter binding for column references in JSONB
  // accessors). Filter is a case-insensitive ILIKE across content and the
  // textual representation of structured_data — fast enough for typical
  // collections, accurate for the user-typed-a-keyword case.
  const SAFE_FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  let orderClause: string;
  if (sortByRaw === "updated_at" || sortByRaw === "created_at") {
    orderClause = `${sortByRaw} ${sortDir}`;
  } else if (SAFE_FIELD_RE.test(sortByRaw)) {
    // Sort by a JSONB field. NULLS LAST so empty values fall to the end
    // regardless of direction — matches user expectation in spreadsheet UI.
    orderClause = `(structured_data->>'${sortByRaw}') ${sortDir} NULLS LAST`;
  } else {
    orderClause = "updated_at DESC";
  }

  const whereParts = ["collection_id = $1"];
  const baseParams: unknown[] = [collectionId];
  if (q) {
    baseParams.push(`%${q}%`);
    whereParts.push(
      `(content ILIKE $${baseParams.length} OR structured_data::text ILIKE $${baseParams.length})`
    );
  }
  const whereSql = `WHERE ${whereParts.join(" AND ")}`;

  const listParams = [...baseParams, limit, offset];
  const result = await query(
    `SELECT id, collection_id, workspace_id, structured_data, content,
            created_by, created_by_agent, created_at, updated_at, version,
            source_row_id
     FROM entries
     ${whereSql}
     ORDER BY ${orderClause}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM entries ${whereSql}`,
    baseParams
  );

  const entries = permissions
    ? result.rows.map((row) => ({
        ...row,
        structured_data: filterDeniedFields(
          permissions,
          collectionName,
          row.structured_data
        ),
      }))
    : result.rows;

  return c.json({
    entries,
    total: countResult.rows[0].total,
  });
});

// Edit which columns a connected collection exposes, plus optionally
// rename or change the content column. Triggers a sync immediately so
// the new column set is reflected in the synced rows.
//
// Only fields that are actually safe to change post-creation are
// updatable: name, source_config.columns, source_config.content_column.
// We deliberately don't allow changing primary_key or table — those
// would invalidate every existing source_row_id and would be a
// re-create operation, not an edit.
collectionRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const SAFE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const updates: string[] = [];
  const params: unknown[] = [];

  if (typeof body.name === "string" && body.name.trim().length > 0) {
    params.push(body.name.trim());
    updates.push(`name = $${params.length}`);
  }

  // Patch source_config in JSONB. Only columns + content_column.
  const cur = await query<{ source_config: Record<string, unknown> | null }>(
    "SELECT source_config FROM collections WHERE id = $1",
    [id]
  );
  if (cur.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }
  const currentConfig = cur.rows[0].source_config;

  if (Array.isArray(body.columns) && currentConfig) {
    const valid = body.columns
      .filter((x: unknown): x is string => typeof x === "string")
      .filter((x: string) => SAFE_NAME.test(x));
    if (valid.length === 0) {
      return c.json({ error: "At least one column must be selected" }, 400);
    }
    // Always include the primary_key in the column list — without it,
    // sync can't track row identity.
    const pk = (currentConfig.primary_key as string) || "";
    const merged = Array.from(new Set([pk, ...valid].filter(Boolean)));

    let nextContentCol = currentConfig.content_column as string | undefined;
    if ("content_column" in body) {
      if (body.content_column === null || body.content_column === "") {
        nextContentCol = undefined;
      } else if (
        typeof body.content_column === "string" &&
        SAFE_NAME.test(body.content_column)
      ) {
        nextContentCol = body.content_column;
      }
    }
    // If content column was set but is no longer selected, drop it.
    if (nextContentCol && !merged.includes(nextContentCol)) {
      nextContentCol = undefined;
    }

    const nextConfig = {
      ...currentConfig,
      columns: merged,
      content_column: nextContentCol,
    };
    params.push(nextConfig);
    updates.push(`source_config = $${params.length}`);
  }

  if (updates.length === 0) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  params.push(id);
  const result = await query(
    `UPDATE collections SET ${updates.join(", ")}
     WHERE id = $${params.length}
     RETURNING ${COLLECTION_COLUMNS.replace(/c\./g, "")}`,
    params
  );

  // If the column set changed, kick off an immediate sync so the user
  // sees the new columns reflected without waiting for the cron.
  const updated = result.rows[0];
  if (updated.source_id) {
    runSyncNow(updated.id).catch((e) =>
      console.error(`Re-sync after edit failed for ${updated.id}:`, e)
    );
  }

  return c.json({ collection: updated });
});

collectionRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await query("DELETE FROM collections WHERE id = $1", [id]);
  return c.json({ message: "Deleted" });
});

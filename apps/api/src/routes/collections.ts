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

  // Kick off an initial sync in the background so the collection is populated
  // by the time the user lands on it.
  if (collection.source_id) {
    runSyncNow(collection.id).catch((e) =>
      console.error(`Initial sync failed for ${collection.id}:`, e)
    );
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

  const result = await query(
    `SELECT id, collection_id, workspace_id, structured_data, content,
            created_by, created_by_agent, created_at, updated_at, version,
            source_row_id
     FROM entries
     WHERE collection_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [collectionId, limit, offset]
  );

  const countResult = await query(
    "SELECT COUNT(*)::int AS total FROM entries WHERE collection_id = $1",
    [collectionId]
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

collectionRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await query("DELETE FROM collections WHERE id = $1", [id]);
  return c.json({ message: "Deleted" });
});

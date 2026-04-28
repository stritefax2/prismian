import { Hono } from "hono";
import { query, transaction } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import { createEntrySchema, updateEntrySchema } from "@teammem/shared";
import type { AgentPermissions } from "@teammem/shared";
import type { AppEnv } from "../types.js";
import { enqueueEmbedding } from "../services/embeddings.js";
import { logAction } from "../services/audit.js";
import { mergeStructuredData } from "../services/merge.js";
import {
  canAccessCollection,
  canDelete,
  checkRateLimit,
  filterDeniedFields,
  getCollectionNameById,
} from "../services/permissions.js";

export const entryRoutes = new Hono<AppEnv>();

entryRoutes.use("*", authMiddleware);
// Entries don't carry workspace_id in their URL or query. Resolve via the
// :id param (entry row) for GET/PUT/DELETE/versions, or via body.collection_id
// for POST.
entryRoutes.use(
  "*",
  requireWorkspaceScope([{ table: "entries", paramName: "id" }])
);

// Connected collections (source_id IS NOT NULL) are read-only mirrors of an
// external database. Writes come from the sync service, never from the HTTP
// API. This rule is enforced here structurally at the top of every mutating
// handler so a permissions bug can't route around it.
const READ_ONLY_RESPONSE = {
  error: "This collection mirrors an external data source and is read-only.",
  code: "read_only_source",
} as const;

entryRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await query(
    `SELECT e.id, e.collection_id, e.workspace_id, e.structured_data, e.content,
            e.created_by, e.created_by_agent, e.created_at, e.updated_at, e.version,
            c.name AS collection_name
     FROM entries e
     INNER JOIN collections c ON e.collection_id = c.id
     WHERE e.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }

  const entry = result.rows[0];
  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;

  if (permissions) {
    if (!canAccessCollection(permissions, entry.collection_name, "read")) {
      return c.json({ error: "Access denied to this collection" }, 403);
    }
    entry.structured_data = filterDeniedFields(
      permissions,
      entry.collection_name,
      entry.structured_data
    );
  }

  logAction(auth, entry.workspace_id, "read", "entry", id);

  const { collection_name: _, ...safeEntry } = entry;
  return c.json({ entry: safeEntry });
});

entryRoutes.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const permissions = auth.permissions as AgentPermissions | undefined;

  const collectionResult = await query(
    "SELECT workspace_id, name, source_id FROM collections WHERE id = $1",
    [parsed.data.collection_id]
  );
  if (collectionResult.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }

  if (collectionResult.rows[0].source_id) {
    return c.json(READ_ONLY_RESPONSE, 409);
  }

  const { workspace_id: workspaceId, name: collectionName } =
    collectionResult.rows[0];

  if (permissions) {
    if (!canAccessCollection(permissions, collectionName, "write")) {
      return c.json({ error: "Write access denied to this collection" }, 403);
    }
    if (!checkRateLimit(auth.agentKeyId!, permissions)) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
  }

  const entry = await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO entries (collection_id, workspace_id, structured_data, content, created_by, created_by_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, collection_id, workspace_id, structured_data, content, created_by, created_by_agent, created_at, updated_at, version`,
      [
        parsed.data.collection_id,
        workspaceId,
        parsed.data.structured_data || null,
        parsed.data.content || null,
        auth.userId || null,
        auth.agentKeyId || null,
      ]
    );

    const entry = result.rows[0];

    await client.query(
      `INSERT INTO entry_versions (entry_id, version, structured_data, content, changed_by, changed_by_agent, change_type)
       VALUES ($1, 1, $2, $3, $4, $5, 'create')`,
      [
        entry.id,
        parsed.data.structured_data || null,
        parsed.data.content || null,
        auth.userId || null,
        auth.agentKeyId || null,
      ]
    );

    return entry;
  });

  enqueueEmbedding(entry.id).catch((e) =>
    console.error("Failed to enqueue embedding:", e)
  );
  logAction(auth, workspaceId, "create", "entry", entry.id, {
    collection: collectionName,
  });

  // Supabase Realtime picks up the INSERT automatically
  return c.json({ entry }, 201);
});

entryRoutes.put("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const permissions = auth.permissions as AgentPermissions | undefined;

  // Pre-check permissions before taking the lock
  const precheck = await query(
    `SELECT e.collection_id, c.name AS collection_name, e.workspace_id,
            c.source_id, e.source_row_id
     FROM entries e INNER JOIN collections c ON e.collection_id = c.id
     WHERE e.id = $1`,
    [id]
  );
  if (precheck.rows.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }

  if (precheck.rows[0].source_id || precheck.rows[0].source_row_id) {
    return c.json(READ_ONLY_RESPONSE, 409);
  }

  if (permissions) {
    if (
      !canAccessCollection(
        permissions,
        precheck.rows[0].collection_name,
        "write"
      )
    ) {
      return c.json({ error: "Write access denied to this collection" }, 403);
    }
    if (!checkRateLimit(auth.agentKeyId!, permissions)) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
  }

  const result = await transaction(async (client) => {
    const current = await client.query(
      "SELECT version, structured_data, content, collection_id, workspace_id FROM entries WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (current.rows.length === 0) {
      return { status: "not_found" as const };
    }

    const currentRow = current.rows[0];

    if (currentRow.version !== parsed.data.version) {
      // Attempt field-level merge for structured data
      if (
        parsed.data.structured_data &&
        currentRow.structured_data
      ) {
        // Find the base version (what the client had before editing)
        const baseResult = await client.query(
          `SELECT structured_data FROM entry_versions
           WHERE entry_id = $1 AND version = $2`,
          [id, parsed.data.version]
        );
        const base = baseResult.rows[0]?.structured_data || {};
        const { merged, conflicts } = mergeStructuredData(
          base,
          currentRow.structured_data,
          parsed.data.structured_data
        );

        if (conflicts.length > 0) {
          return {
            status: "conflict" as const,
            conflicts,
            server_version: currentRow.version,
            server_data: currentRow.structured_data,
          };
        }

        // Auto-merge succeeded
        const newVersion = currentRow.version + 1;
        const updated = await client.query(
          `UPDATE entries
           SET structured_data = $1,
               content = COALESCE($2, content),
               version = $3,
               updated_at = now()
           WHERE id = $4
           RETURNING id, collection_id, workspace_id, structured_data, content, created_by, created_by_agent, created_at, updated_at, version`,
          [merged, parsed.data.content || null, newVersion, id]
        );

        await client.query(
          `INSERT INTO entry_versions (entry_id, version, structured_data, content, changed_by, changed_by_agent, change_type)
           VALUES ($1, $2, $3, $4, $5, $6, 'update')`,
          [
            id,
            newVersion,
            merged,
            parsed.data.content || currentRow.content,
            auth.userId || null,
            auth.agentKeyId || null,
          ]
        );

        return { status: "merged" as const, entry: updated.rows[0] };
      }

      // For content-only conflicts, reject
      return {
        status: "conflict" as const,
        server_version: currentRow.version,
      };
    }

    // Version matches — straight update
    const newVersion = parsed.data.version + 1;
    const updated = await client.query(
      `UPDATE entries
       SET structured_data = COALESCE($1, structured_data),
           content = COALESCE($2, content),
           version = $3,
           updated_at = now()
       WHERE id = $4
       RETURNING id, collection_id, workspace_id, structured_data, content, created_by, created_by_agent, created_at, updated_at, version`,
      [
        parsed.data.structured_data || null,
        parsed.data.content || null,
        newVersion,
        id,
      ]
    );

    await client.query(
      `INSERT INTO entry_versions (entry_id, version, structured_data, content, changed_by, changed_by_agent, change_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'update')`,
      [
        id,
        newVersion,
        parsed.data.structured_data || null,
        parsed.data.content || null,
        auth.userId || null,
        auth.agentKeyId || null,
      ]
    );

    return { status: "ok" as const, entry: updated.rows[0] };
  });

  if (result.status === "not_found") {
    return c.json({ error: "Entry not found" }, 404);
  }

  if (result.status === "conflict") {
    return c.json(
      {
        error: "Version conflict",
        conflicts: result.conflicts,
        server_version: result.server_version,
        server_data: result.server_data,
      },
      409
    );
  }

  const entry = result.entry;

  enqueueEmbedding(entry.id).catch((e) =>
    console.error("Failed to enqueue embedding:", e)
  );
  logAction(auth, entry.workspace_id, "update", "entry", entry.id);

  // Supabase Realtime picks up the UPDATE automatically
  return c.json({ entry, auto_merged: result.status === "merged" });
});

entryRoutes.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const permissions = auth.permissions as AgentPermissions | undefined;

  const precheck = await query(
    `SELECT e.collection_id, c.name AS collection_name, e.workspace_id,
            c.source_id, e.source_row_id
     FROM entries e INNER JOIN collections c ON e.collection_id = c.id
     WHERE e.id = $1`,
    [id]
  );

  if (precheck.rows.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }

  if (precheck.rows[0].source_id || precheck.rows[0].source_row_id) {
    return c.json(READ_ONLY_RESPONSE, 409);
  }

  if (permissions) {
    if (!canDelete(permissions)) {
      return c.json({ error: "Delete not permitted" }, 403);
    }
    if (
      !canAccessCollection(
        permissions,
        precheck.rows[0].collection_name,
        "delete"
      )
    ) {
      return c.json({ error: "Delete access denied to this collection" }, 403);
    }
  }

  const deleted = await transaction(async (client) => {
    const current = await client.query(
      "SELECT version, structured_data, content, collection_id, workspace_id FROM entries WHERE id = $1",
      [id]
    );

    if (current.rows.length === 0) return null;
    const row = current.rows[0];

    await client.query(
      `INSERT INTO entry_versions (entry_id, version, structured_data, content, changed_by, changed_by_agent, change_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'delete')`,
      [
        id,
        row.version + 1,
        row.structured_data,
        row.content,
        auth.userId || null,
        auth.agentKeyId || null,
      ]
    );

    await client.query("DELETE FROM entries WHERE id = $1", [id]);
    return row;
  });

  if (deleted) {
    logAction(auth, deleted.workspace_id, "delete", "entry", id);
    // Supabase Realtime picks up the DELETE automatically
  }

  return c.json({ message: "Deleted" });
});

entryRoutes.get("/:id/versions", async (c) => {
  const id = c.req.param("id");
  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;

  // Version history contains the same structured_data as the entry itself,
  // so redaction and per-key collection access must be enforced here too —
  // otherwise /versions is a trivial bypass around /entries/:id.
  const entryLookup = await query<{ collection_name: string }>(
    `SELECT c.name AS collection_name
     FROM entries e INNER JOIN collections c ON e.collection_id = c.id
     WHERE e.id = $1`,
    [id]
  );
  if (entryLookup.rows.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }
  const collectionName = entryLookup.rows[0].collection_name;

  if (permissions && !canAccessCollection(permissions, collectionName, "read")) {
    return c.json({ error: "Access denied to this collection" }, 403);
  }

  const result = await query(
    `SELECT ev.*, u.name AS changed_by_name, u.email AS changed_by_email,
            ak.name AS changed_by_agent_name
     FROM entry_versions ev
     LEFT JOIN users u ON ev.changed_by = u.id
     LEFT JOIN agent_keys ak ON ev.changed_by_agent = ak.id
     WHERE ev.entry_id = $1
     ORDER BY ev.version DESC`,
    [id]
  );

  const versions = permissions
    ? result.rows.map((v) => ({
        ...v,
        structured_data: filterDeniedFields(
          permissions,
          collectionName,
          v.structured_data
        ),
      }))
    : result.rows;

  return c.json({ versions });
});

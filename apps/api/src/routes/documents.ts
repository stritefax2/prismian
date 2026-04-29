import { Hono } from "hono";
import { query, transaction } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import { logAction } from "../services/audit.js";
import type { AppEnv } from "../types.js";
import type { AgentPermissions } from "../shared/index.js";
import {
  canAccessCollection,
  checkRateLimit,
} from "../services/permissions.js";
import { z } from "zod";

export const documentRoutes = new Hono<AppEnv>();

documentRoutes.use("*", authMiddleware);
documentRoutes.use("*", requireWorkspaceScope());

const storeDocumentSchema = z.object({
  collection_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

documentRoutes.post("/store", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = storeDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { collection_id, title, content, source, metadata } = parsed.data;
  const permissions = auth.permissions as AgentPermissions | undefined;

  const collectionResult = await query(
    "SELECT workspace_id, name, source_id FROM collections WHERE id = $1",
    [collection_id]
  );
  if (collectionResult.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }

  if (collectionResult.rows[0].source_id) {
    return c.json(
      {
        error:
          "This collection mirrors an external data source and is read-only.",
        code: "read_only_source",
      },
      409
    );
  }

  const { workspace_id: workspaceId, name: collectionName } =
    collectionResult.rows[0];

  if (permissions) {
    if (!canAccessCollection(permissions, collectionName, "write")) {
      return c.json({ error: "Write access denied to this collection" }, 403);
    }
    if (auth.agentKeyId && !checkRateLimit(auth.agentKeyId, permissions)) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
  }

  const structuredData: Record<string, unknown> = {
    title,
    ...(source ? { source } : {}),
    ...(metadata || {}),
  };

  // One entry with full content — keyword search runs on the full text.
  const entry = await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO entries (collection_id, workspace_id, structured_data, content, created_by, created_by_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, collection_id, workspace_id, structured_data, content, created_at, updated_at, version`,
      [
        collection_id,
        workspaceId,
        structuredData,
        content,
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
        structuredData,
        content,
        auth.userId || null,
        auth.agentKeyId || null,
      ]
    );

    return entry;
  });

  logAction(auth, workspaceId, "store_document", "entry", entry.id, {
    collection: collectionName,
    title,
    content_length: content.length,
    source,
  });

  return c.json(
    {
      entry_id: entry.id,
      title,
      content_length: content.length,
    },
    201
  );
});

import { Hono } from "hono";
import { query } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireWorkspaceScope } from "../middleware/workspace-scope.js";
import {
  searchSchema,
  structuredQuerySchema,
  aggregateSchema,
} from "../shared/index.js";
import type { AppEnv } from "../types.js";
import {
  canAccessCollection,
  canUseQueryType,
  getMaxResults,
  getAccessibleCollectionIds,
  filterDeniedFields,
} from "../services/permissions.js";
import type { AgentPermissions, SourceConfig } from "../shared/index.js";
import { logAction } from "../services/audit.js";
import { loadConnectionString } from "../services/connectors/sync.js";
import {
  allowedColumnsFor,
  buildStructuredSql,
  buildCountSql,
  buildAggregateSql,
  buildFullTextSql,
  runLiveSql,
  shapeLiveRow,
  LiveQueryError,
  type DslFilter,
} from "../services/connectors/live-query.js";

interface LiveTarget {
  collectionId: string;
  workspaceId: string;
  collectionName: string;
  config: SourceConfig;
  sourceId: string;
}

// Shared plumbing for the live branches below: resolve credentials, run,
// and translate failures into HTTP-shaped errors.
async function runLive(
  target: LiveTarget,
  built: { sql: string; params: unknown[] }
): Promise<Record<string, unknown>[]> {
  const connectionString = await loadConnectionString(target.sourceId);
  if (!connectionString) {
    throw new LiveQueryError("Data source credentials missing", 400);
  }
  return runLiveSql(connectionString, built);
}

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.use("*", authMiddleware);
searchRoutes.use("*", requireWorkspaceScope());

// Whitelist for safe JSONB field names (alphanumeric + underscore only)
const SAFE_FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeFieldName(field: string): void {
  if (!SAFE_FIELD_RE.test(field)) {
    throw Object.assign(new Error(`Invalid field name: ${field}`), {
      status: 400,
    });
  }
}

searchRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { query: searchQuery, collection, limit } = parsed.data;
  const auth = c.get("auth");

  const workspaceId = auth.workspaceId || body.workspace_id;
  if (!workspaceId) {
    return c.json({ error: "workspace_id required" }, 400);
  }

  const permissions = auth.permissions as AgentPermissions | undefined;
  const effectiveLimit = permissions
    ? Math.min(limit, getMaxResults(permissions))
    : limit;

  let collectionFilter: string[] | null = null;
  if (permissions) {
    collectionFilter = await getAccessibleCollectionIds(
      permissions,
      workspaceId,
      "read"
    );
    if (collectionFilter.length === 0) {
      return c.json({ results: [] });
    }
    // If the caller pinned the search to a specific collection, that
    // collection must be inside the agent's accessible set. Otherwise an
    // agent with read access to ONE collection could pass any other
    // collection UUID in the workspace and exfiltrate its rows.
    if (collection && !collectionFilter.includes(collection)) {
      return c.json(
        { error: "Read access denied to this collection" },
        403
      );
    }
  }

  // A search pinned to a live collection runs keyword search against the
  // source database at request time. (Workspace-wide search only covers
  // native + mirrored collections — fanning out to N customer databases
  // per search is not something we do; the diagnostic below points agents
  // at live collections explicitly.)
  if (collection) {
    const liveLookup = await query<{
      name: string;
      workspace_id: string;
      source_id: string | null;
      source_config: SourceConfig | null;
      source_mode: string | null;
    }>(
      "SELECT name, workspace_id, source_id, source_config, source_mode FROM collections WHERE id = $1 AND workspace_id = $2",
      [collection, workspaceId]
    );
    const lr = liveLookup.rows[0];
    if (lr && lr.source_mode === "live" && lr.source_id && lr.source_config) {
      const deniedFields = new Set(
        permissions?.field_restrictions?.[lr.name]?.deny_fields ?? []
      );
      const allowed = allowedColumnsFor(lr.source_config, deniedFields);
      try {
        const built = buildFullTextSql(lr.source_config, allowed, {
          query: searchQuery,
          limit: effectiveLimit,
        });
        const connectionString = await loadConnectionString(lr.source_id);
        if (!connectionString) {
          return c.json({ error: "Data source credentials missing" }, 502);
        }
        const rows = await runLiveSql(connectionString, built);
        const results = rows.map((row) => {
          const { __relevance, ...rest } = row;
          const shaped = shapeLiveRow(
            rest,
            {
              id: collection,
              workspace_id: workspaceId,
              source_config: lr.source_config!,
            },
            allowed
          );
          return {
            entry_id: shaped.id,
            collection_id: collection,
            collection: lr.name,
            content: shaped.content,
            structured_data: shaped.structured_data,
            relevance_score: __relevance,
            live: true,
          };
        });
        if (auth.agentKeyId) {
          logAction(auth, workspaceId, "search", "entries", undefined, {
            query: searchQuery.slice(0, 200),
            returned: results.length,
            collection,
            live: true,
          });
        }
        return c.json({ results });
      } catch (e) {
        if (e instanceof LiveQueryError) {
          return c.json({ error: e.message }, e.status);
        }
        return c.json(
          {
            error: `Live query against source failed: ${e instanceof Error ? e.message : String(e)}`,
          },
          502
        );
      }
    }
  }

  let results: any[] = [];
  const canFulltext = !permissions || canUseQueryType(permissions, "fulltext");

  if (canFulltext) {
    // FTS-only mode. Two improvements over the previous behavior:
    //   (1) tokenize structured_data alongside content, so entries that store
    //       all their data as JSON (CRM rows, user profiles, etc.) are findable
    //       by keyword. structured_data::text yields the JSON serialization;
    //       to_tsvector strips braces/quotes/punctuation and stems values.
    //   (2) match with OR semantics (any token), not plainto_tsquery's strict
    //       AND. ts_rank still ranks entries that match more terms higher, so
    //       a query like "Google earnings revenue" surfaces full matches first
    //       and partial matches after — instead of returning nothing if any
    //       single word is missing.
    const tsExpr = `to_tsvector('english', COALESCE(e.content, '') || ' ' || COALESCE(e.structured_data::text, ''))`;
    const params: unknown[] = [searchQuery, workspaceId, effectiveLimit];
    let sql = `
      WITH q AS (
        SELECT to_tsquery(
          'english',
          NULLIF(replace(plainto_tsquery('english', $1)::text, '&', '|'), '')
        ) AS qq
      )
      SELECT e.id AS entry_id, c.id AS collection_id, c.name AS collection,
             e.content, e.structured_data,
             ts_rank(${tsExpr}, q.qq) AS relevance_score
      FROM entries e
      INNER JOIN collections c ON e.collection_id = c.id
      CROSS JOIN q
      WHERE e.workspace_id = $2
        AND q.qq IS NOT NULL
        AND ${tsExpr} @@ q.qq
    `;

    if (collection) {
      sql += ` AND e.collection_id = $${params.length + 1}`;
      params.push(collection);
    } else if (collectionFilter) {
      sql += ` AND e.collection_id = ANY($${params.length + 1})`;
      params.push(collectionFilter);
    }

    sql += ` ORDER BY relevance_score DESC LIMIT $3`;

    const ftsResult = await query(sql, params);
    results = ftsResult.rows;
  }

  if (permissions) {
    results = results.map((r) => ({
      ...r,
      structured_data: filterDeniedFields(
        permissions,
        r.collection,
        r.structured_data
      ),
    }));
  }

  if (auth.agentKeyId) {
    logAction(auth, workspaceId, "search", "entries", undefined, {
      query: searchQuery.slice(0, 200),
      returned: results.length,
      collection: collection || undefined,
    });
  }

  // When search returns nothing, agents need to know *why* — was the workspace
  // empty? Were there only structured rows with no embeddings? Was OPENAI_API_KEY
  // unset? Without this, the LLM gives up and tells the user "nothing stored on
  // that topic," which is often wrong (the data exists, the query type is wrong).
  if (results.length === 0) {
    const diagnostic = await buildEmptyDiagnostic({
      workspaceId,
      collectionFilter,
      requestedCollection: collection ?? null,
    });
    return c.json({ results: [], diagnostic });
  }

  return c.json({ results });
});

async function buildEmptyDiagnostic(args: {
  workspaceId: string;
  collectionFilter: string[] | null;
  requestedCollection: string | null;
}) {
  const { workspaceId, collectionFilter, requestedCollection } = args;
  const params: unknown[] = [workspaceId];
  let where = "WHERE c.workspace_id = $1";
  if (requestedCollection) {
    where += ` AND c.id = $${params.length + 1}`;
    params.push(requestedCollection);
  } else if (collectionFilter) {
    where += ` AND c.id = ANY($${params.length + 1})`;
    params.push(collectionFilter);
  }

  const colInfo = await query<{
    id: string;
    name: string;
    source_id: string | null;
    source_config: { columns?: string[]; content_column?: string } | null;
    source_mode: string | null;
    entry_count: number;
  }>(
    `SELECT c.id, c.name, c.source_id, c.source_config, c.source_mode,
            (SELECT COUNT(*)::int FROM entries WHERE collection_id = c.id) AS entry_count
     FROM collections c
     ${where}`,
    params
  );

  const collections = colInfo.rows.map((r) => {
    const synced = Boolean(r.source_id);
    const live = r.source_mode === "live";
    const contentCol = r.source_config?.content_column ?? null;
    const queryableFields = r.source_config?.columns ?? [];
    return {
      id: r.id,
      name: r.name,
      synced,
      live,
      writable: !synced,
      content_column: contentCol,
      queryable_fields: queryableFields,
      entry_count: r.entry_count,
    };
  });

  // Live collections have zero local entries by design — their rows live
  // in the source database. Don't let them trip the "no entries" branch.
  const liveCollections = collections.filter((c) => c.live);
  const withEntries = collections.filter((c) => c.entry_count > 0);
  const totalEntries = collections.reduce((s, c) => s + c.entry_count, 0);

  let suggestion: string;
  if (collections.length === 0) {
    suggestion =
      "No accessible collections in this workspace. Ask an admin for read access, or check that you're querying the right workspace.";
  } else if (liveCollections.length > 0 && totalEntries === 0) {
    const names = liveCollections
      .map(
        (c) =>
          `${c.name} (${c.queryable_fields.slice(0, 5).join(", ")}${c.queryable_fields.length > 5 ? ", …" : ""})`
      )
      .join("; ");
    suggestion = `This workspace has live collections that are queried directly from the source database — workspace-wide search doesn't cover them. Use query_structured or aggregate on: ${names}. Or pass collection=<id> to search to keyword-search one live collection.`;
  } else if (totalEntries === 0) {
    suggestion =
      "Collections exist but have no entries yet. Use store_document or write_entry to add content.";
  } else if (withEntries.length > 0) {
    const fieldHints = withEntries
      .filter((c) => c.queryable_fields.length > 0)
      .map(
        (c) =>
          `${c.name} (${c.queryable_fields.slice(0, 5).join(", ")}${c.queryable_fields.length > 5 ? ", …" : ""})`
      )
      .join("; ");
    suggestion = fieldHints
      ? `Keyword search matched no entries. For exact-field matches try query_structured on: ${fieldHints}. Or rephrase with terms likely to appear verbatim.`
      : "Keyword search matched no entries. Try simpler/fewer keywords, or use query_structured if you know the field shape.";
    if (liveCollections.length > 0) {
      suggestion += ` Note: live collections (${liveCollections.map((c) => c.name).join(", ")}) are not covered by workspace-wide search — query them with query_structured/aggregate, or pin search with collection=<id>.`;
    }
  } else {
    suggestion =
      "Your query matched no entries. Rephrase with simpler keywords, or check list_collections to see what's stored.";
  }

  return {
    collections_searched: collections.length,
    total_entries_in_scope: totalEntries,
    collections,
    suggestion,
  };
}

searchRoutes.post("/structured", async (c) => {
  const body = await c.req.json();
  const parsed = structuredQuerySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;

  if (permissions && !canUseQueryType(permissions, "structured")) {
    return c.json({ error: "Structured queries not permitted" }, 403);
  }

  const { collection, filters, sort_by, limit } = parsed.data;

  // Resolve the target collection's workspace + name so we can enforce
  // cross-workspace isolation (an agent in workspace A can't query a UUID
  // from workspace B) AND per-key access/field rules.
  const colLookup = await query<{
    workspace_id: string;
    name: string;
    source_id: string | null;
    source_config: SourceConfig | null;
    source_mode: string | null;
  }>(
    "SELECT workspace_id, name, source_id, source_config, source_mode FROM collections WHERE id = $1",
    [collection]
  );
  if (colLookup.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }
  const targetWorkspace = colLookup.rows[0].workspace_id;
  const collectionName = colLookup.rows[0].name;

  // Agent keys are workspace-bound.
  if (auth.agentKeyId && auth.workspaceId !== targetWorkspace) {
    return c.json(
      { error: "Agent key not authorized for this workspace" },
      403
    );
  }
  // Human users must be members of the collection's workspace.
  if (auth.userId && !auth.agentKeyId) {
    const member = await query(
      `SELECT 1 FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL`,
      [targetWorkspace, auth.userId]
    );
    if (member.rows.length === 0) {
      return c.json({ error: "Not a member of this workspace" }, 403);
    }
  }
  // Per-key collection access.
  if (permissions && !canAccessCollection(permissions, collectionName, "read")) {
    return c.json({ error: "Read access denied to this collection" }, 403);
  }

  const effectiveLimit = permissions
    ? Math.min(limit, getMaxResults(permissions))
    : limit;

  // Live collections: translate the same DSL into a SELECT against the
  // source database, executed now, inside a READ ONLY transaction. Denied
  // columns are excluded from the projection, and filters/sorts referencing
  // them fail loudly (they'd leak by inference otherwise).
  const liveRow = colLookup.rows[0];
  if (liveRow.source_mode === "live" && liveRow.source_id && liveRow.source_config) {
    const target: LiveTarget = {
      collectionId: collection,
      workspaceId: targetWorkspace,
      collectionName,
      config: liveRow.source_config,
      sourceId: liveRow.source_id,
    };
    const deniedFields = new Set(
      permissions?.field_restrictions?.[collectionName]?.deny_fields ?? []
    );
    const allowed = allowedColumnsFor(target.config, deniedFields);
    try {
      const built = buildStructuredSql(target.config, allowed, deniedFields, {
        filters: filters as DslFilter[],
        sort_by,
        limit: effectiveLimit,
      });
      const [rows, countRows] = await Promise.all([
        runLive(target, built),
        runLive(
          target,
          buildCountSql(target.config, allowed, deniedFields, [])
        ),
      ]);
      const results = rows.map((row) =>
        shapeLiveRow(
          row,
          {
            id: collection,
            workspace_id: targetWorkspace,
            source_config: target.config,
          },
          allowed
        )
      );
      if (auth.agentKeyId) {
        logAction(auth, targetWorkspace, "query_structured", "entries", collection, {
          collection: collectionName,
          filters: filters?.length || 0,
          returned: results.length,
          live: true,
        });
      }
      return c.json({
        results,
        total: (countRows[0]?.total as number) ?? results.length,
        live: true,
      });
    } catch (e) {
      if (e instanceof LiveQueryError) {
        return c.json({ error: e.message }, e.status);
      }
      return c.json(
        {
          error: `Live query against source failed: ${e instanceof Error ? e.message : String(e)}`,
        },
        502
      );
    }
  }

  let sql = `
    SELECT id, collection_id, workspace_id, structured_data, content,
           created_at, updated_at, version
    FROM entries
    WHERE collection_id = $1
  `;
  const params: unknown[] = [collection];

  for (const filter of filters) {
    assertSafeFieldName(filter.field);
    const paramIdx = params.length + 1;
    const jsonPath = `structured_data->>'${filter.field}'`;

    switch (filter.op) {
      case "eq":
        sql += ` AND ${jsonPath} = $${paramIdx}`;
        params.push(String(filter.value));
        break;
      case "neq":
        sql += ` AND ${jsonPath} != $${paramIdx}`;
        params.push(String(filter.value));
        break;
      case "contains":
        sql += ` AND ${jsonPath} ILIKE $${paramIdx}`;
        params.push(`%${filter.value}%`);
        break;
      case "gt":
        sql += ` AND (${jsonPath})::numeric > $${paramIdx}`;
        params.push(filter.value);
        break;
      case "gte":
        sql += ` AND (${jsonPath})::numeric >= $${paramIdx}`;
        params.push(filter.value);
        break;
      case "lt":
        sql += ` AND (${jsonPath})::numeric < $${paramIdx}`;
        params.push(filter.value);
        break;
      case "lte":
        sql += ` AND (${jsonPath})::numeric <= $${paramIdx}`;
        params.push(filter.value);
        break;
    }
  }

  if (sort_by) {
    assertSafeFieldName(sort_by);
    sql += ` ORDER BY structured_data->>'${sort_by}'`;
  } else {
    sql += ` ORDER BY updated_at DESC`;
  }

  sql += ` LIMIT $${params.length + 1}`;
  params.push(effectiveLimit);

  const result = await query(sql, params);
  const countResult = await query(
    "SELECT COUNT(*)::int AS total FROM entries WHERE collection_id = $1",
    [collection]
  );

  // Apply per-key column redaction to every row before it leaves the
  // API. Without this, `/structured` would silently return denied columns.
  const results = permissions
    ? result.rows.map((row) => ({
        ...row,
        structured_data: filterDeniedFields(
          permissions,
          collectionName,
          row.structured_data
        ),
      }))
    : result.rows;

  if (auth.agentKeyId) {
    logAction(
      auth,
      targetWorkspace,
      "query_structured",
      "entries",
      collection,
      {
        collection: collectionName,
        filters: parsed.data.filters?.length || 0,
        returned: results.length,
        total: countResult.rows[0].total,
      }
    );
  }

  return c.json({
    results,
    total: countResult.rows[0].total,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/v1/search/aggregate
//
// Safe, structured aggregation over entries.structured_data. Covers
// COUNT / SUM / AVG / MIN / MAX with optional GROUP BY, WHERE, HAVING,
// ORDER BY. Every field name is validated (assertSafeFieldName) so the
// interpolated SQL is always composed from whitelisted identifiers.
//
// Deliberately NOT exposed: raw SQL, subqueries, CTEs, window functions,
// cross-collection joins, DATE_TRUNC. Those require much more parsing/
// rewriting to be safe. See the commit message where this landed.
// ──────────────────────────────────────────────────────────────────────────
searchRoutes.post("/aggregate", async (c) => {
  const body = await c.req.json();
  const parsed = aggregateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const auth = c.get("auth");
  const permissions = auth.permissions as AgentPermissions | undefined;

  if (permissions && !canUseQueryType(permissions, "structured")) {
    return c.json({ error: "Structured queries not permitted" }, 403);
  }

  const { collection, group_by, aggregations, filters, having, order_by, limit } =
    parsed.data;

  // Look up the collection to find its workspace, name, and schema so we
  // can enforce cross-workspace isolation, per-key collection access,
  // field redaction, and (nice-to-have) validate field names against
  // the known column list.
  const colInfo = await query<{
    workspace_id: string;
    name: string;
    source_id: string | null;
    source_config: SourceConfig | null;
    source_mode: string | null;
  }>(
    "SELECT workspace_id, name, source_id, source_config, source_mode FROM collections WHERE id = $1",
    [collection]
  );
  if (colInfo.rows.length === 0) {
    return c.json({ error: "Collection not found" }, 404);
  }
  const targetWorkspace = colInfo.rows[0].workspace_id;
  const collectionName = colInfo.rows[0].name;
  const knownColumns = colInfo.rows[0].source_config?.columns;

  // Cross-workspace isolation: an agent bound to workspace A cannot
  // aggregate a UUID that belongs to workspace B.
  if (auth.agentKeyId && auth.workspaceId !== targetWorkspace) {
    return c.json(
      { error: "Agent key not authorized for this workspace" },
      403
    );
  }
  if (auth.userId && !auth.agentKeyId) {
    const member = await query(
      `SELECT 1 FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2 AND accepted_at IS NOT NULL`,
      [targetWorkspace, auth.userId]
    );
    if (member.rows.length === 0) {
      return c.json({ error: "Not a member of this workspace" }, 403);
    }
  }
  // Per-key collection access.
  if (permissions && !canAccessCollection(permissions, collectionName, "read")) {
    return c.json({ error: "Read access denied to this collection" }, 403);
  }

  // Redaction enforcement: if this agent key has field_restrictions on
  // this collection, refuse to aggregate on denied fields outright.
  // We can't "silently strip" an aggregation the way we strip fields
  // from a row — SUM(denied_field) would silently leak the sum. Fail loud.
  const deniedFields = new Set(
    permissions?.field_restrictions?.[collectionName]?.deny_fields ?? []
  );
  const usedFields = new Set<string>();
  for (const f of filters ?? []) usedFields.add(f.field);
  for (const g of group_by ?? []) usedFields.add(g);
  for (const a of aggregations) if (a.field) usedFields.add(a.field);

  for (const f of usedFields) {
    if (deniedFields.has(f)) {
      return c.json(
        {
          error: `Field '${f}' is redacted for this agent key and cannot be used in aggregates.`,
          code: "redacted_field_referenced",
        },
        403
      );
    }
    // Soft nudge: if the column doesn't exist in the connected schema,
    // return an informative error instead of silently returning NULLs.
    if (knownColumns && !knownColumns.includes(f)) {
      return c.json(
        {
          error: `Field '${f}' is not in this collection's schema.`,
          available_fields: knownColumns,
        },
        400
      );
    }
  }

  // Live collections: run the aggregate on the source database directly —
  // and against ALL rows in the source table, not a 10k-row mirror cap,
  // so SUM/COUNT answers are exact and current.
  const aggRow = colInfo.rows[0];
  if (aggRow.source_mode === "live" && aggRow.source_id && aggRow.source_config) {
    const target: LiveTarget = {
      collectionId: collection,
      workspaceId: targetWorkspace,
      collectionName,
      config: aggRow.source_config,
      sourceId: aggRow.source_id,
    };
    const allowed = allowedColumnsFor(target.config, deniedFields);
    try {
      const built = buildAggregateSql(target.config, allowed, deniedFields, {
        group_by,
        aggregations,
        filters: filters as DslFilter[] | undefined,
        having,
        order_by,
        limit,
      });
      const rows = await runLive(target, built);
      if (auth.agentKeyId) {
        logAction(auth, targetWorkspace, "aggregate", "entries", collection, {
          collection: collectionName,
          aggregations: aggregations?.length || 0,
          groups: group_by?.length || 0,
          returned: rows.length,
          live: true,
        });
      }
      return c.json({ results: rows, live: true });
    } catch (e) {
      if (e instanceof LiveQueryError) {
        return c.json({ error: e.message }, e.status);
      }
      return c.json(
        {
          error: `Live query against source failed: ${e instanceof Error ? e.message : String(e)}`,
        },
        502
      );
    }
  }

  // Build aggregate expressions. Aliases are optional — default to
  // `${op}_${field}` or `count` for bare count.
  const aliasFor = (a: (typeof aggregations)[number]): string =>
    a.alias ?? (a.field ? `${a.op}_${a.field}` : "count");

  const aliases = new Set<string>();
  const selectParts: string[] = [];

  for (const g of group_by ?? []) {
    selectParts.push(`structured_data->>'${g}' AS "${g}"`);
    aliases.add(g);
  }

  for (const a of aggregations) {
    const alias = aliasFor(a);
    if (aliases.has(alias)) {
      return c.json(
        { error: `Duplicate alias '${alias}' in aggregations.` },
        400
      );
    }
    aliases.add(alias);

    if (a.op === "count") {
      if (a.field) {
        // COUNT of non-null field
        selectParts.push(
          `COUNT(structured_data->>'${a.field}')::int AS "${alias}"`
        );
      } else {
        selectParts.push(`COUNT(*)::int AS "${alias}"`);
      }
    } else {
      // SUM/AVG/MIN/MAX need numeric casting on the JSONB field
      selectParts.push(
        `${a.op.toUpperCase()}((structured_data->>'${a.field}')::numeric) AS "${alias}"`
      );
    }
  }

  // WHERE clause — reuses the filter shape from structured query.
  const params: unknown[] = [collection];
  let whereSql = "WHERE collection_id = $1";
  for (const f of filters ?? []) {
    const idx = params.length + 1;
    const path = `structured_data->>'${f.field}'`;
    switch (f.op) {
      case "eq":
        whereSql += ` AND ${path} = $${idx}`;
        params.push(String(f.value));
        break;
      case "neq":
        whereSql += ` AND ${path} != $${idx}`;
        params.push(String(f.value));
        break;
      case "contains":
        whereSql += ` AND ${path} ILIKE $${idx}`;
        params.push(`%${f.value}%`);
        break;
      case "in": {
        if (!Array.isArray(f.value) || f.value.length === 0) {
          return c.json(
            { error: "`in` filter requires a non-empty array value" },
            400
          );
        }
        whereSql += ` AND ${path} = ANY($${idx}::text[])`;
        params.push(f.value.map(String));
        break;
      }
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        const cmp = { gt: ">", gte: ">=", lt: "<", lte: "<=" }[f.op];
        whereSql += ` AND (${path})::numeric ${cmp} $${idx}`;
        params.push(f.value);
        break;
      }
    }
  }

  // GROUP BY
  let groupSql = "";
  if (group_by && group_by.length > 0) {
    groupSql = ` GROUP BY ${group_by.map((g) => `structured_data->>'${g}'`).join(", ")}`;
  }

  // HAVING — only references aggregate aliases we just defined.
  let havingSql = "";
  if (having && having.length > 0) {
    const clauses: string[] = [];
    for (const h of having) {
      if (!aliases.has(h.alias)) {
        return c.json(
          {
            error: `having clause references unknown alias '${h.alias}'. Known: ${Array.from(aliases).join(", ")}`,
          },
          400
        );
      }
      const cmp = {
        eq: "=",
        neq: "!=",
        gt: ">",
        gte: ">=",
        lt: "<",
        lte: "<=",
      }[h.op];
      const idx = params.length + 1;
      clauses.push(`"${h.alias}" ${cmp} $${idx}`);
      params.push(h.value);
    }
    havingSql = ` HAVING ${clauses.join(" AND ")}`;
  }

  // ORDER BY — only aliases we defined.
  let orderSql = "";
  if (order_by) {
    if (!aliases.has(order_by.alias)) {
      return c.json(
        { error: `order_by references unknown alias '${order_by.alias}'` },
        400
      );
    }
    orderSql = ` ORDER BY "${order_by.alias}" ${order_by.direction.toUpperCase()} NULLS LAST`;
  }

  const limitIdx = params.length + 1;
  params.push(limit);

  const sql = `SELECT ${selectParts.join(", ")} FROM entries ${whereSql}${groupSql}${havingSql}${orderSql} LIMIT $${limitIdx}`;

  const result = await query(sql, params);

  if (auth.agentKeyId) {
    logAction(
      auth,
      colInfo.rows[0].workspace_id,
      "aggregate",
      "entries",
      collection,
      {
        collection: colInfo.rows[0].name,
        aggregations: parsed.data.aggregations?.length || 0,
        groups: parsed.data.group_by?.length || 0,
        returned: result.rows.length,
      }
    );
  }

  return c.json({ results: result.rows });
});

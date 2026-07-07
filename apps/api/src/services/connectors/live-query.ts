import type { SourceConfig } from "../../shared/index.js";
import {
  quoteIdent,
  quoteQualified,
  readOnlyQuery,
} from "./postgres.js";

// Live query mode: the agent-facing query DSL (the same closed shape the
// mirror routes accept) is translated into SELECTs against the customer's
// source table and executed at request time. Nothing is stored on our side.
//
// Two invariants this module owns:
//   1. Only SELECTs are ever generated, executed inside READ ONLY
//      transactions (see readOnlyQuery).
//   2. Redaction happens by *projection*: the SELECT list only ever
//      contains columns the caller may see, so denied data never leaves
//      the source database at all — strictly stronger than the mirror's
//      strip-after-fetch.
//
// Field references outside the allowed set fail loudly (LiveQueryError)
// instead of being silently stripped — filtering or aggregating on a
// denied column would leak it by inference.

const LIVE_STATEMENT_TIMEOUT_MS = 15_000;

export class LiveQueryError extends Error {
  status: 400 | 403;
  constructor(message: string, status: 400 | 403 = 400) {
    super(message);
    this.status = status;
  }
}

export interface DslFilter {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: unknown;
}

export interface LiveCollectionRef {
  id: string;
  workspace_id: string;
  source_config: SourceConfig;
}

interface Sql {
  sql: string;
  params: unknown[];
}

// Columns this caller may see: the configured column set minus per-key
// denials. Because live mode redacts by projection, this is computed once
// and drives both the SELECT list and field-reference validation.
export function allowedColumnsFor(
  config: SourceConfig,
  deniedFields: Set<string>
): string[] {
  return config.columns.filter((c) => !deniedFields.has(c));
}

function assertAllowedField(
  field: string,
  allowedColumns: string[],
  deniedFields: Set<string>
): void {
  if (deniedFields.has(field)) {
    throw new LiveQueryError(
      `Field '${field}' is redacted for this agent key and cannot be referenced.`,
      403
    );
  }
  if (!allowedColumns.includes(field)) {
    throw new LiveQueryError(
      `Field '${field}' is not in this collection's schema. Available: ${allowedColumns.join(", ")}`,
      400
    );
  }
}

// The SELECT list: allowed columns only. The primary key is always
// included — it's the row identity agents use to reference rows — and is
// therefore not redactable (same behavior as the mirror, where
// source_row_id is always present).
function projection(config: SourceConfig, allowedColumns: string[]): string {
  const cols = Array.from(new Set([config.primary_key, ...allowedColumns]));
  return cols.map(quoteIdent).join(", ");
}

// WHERE clauses matching the mirror's semantics: text comparison for
// eq/neq/contains/in (the mirror compared `structured_data->>'f'` as text),
// numeric casts for range operators.
function buildWhere(
  filters: DslFilter[],
  allowedColumns: string[],
  deniedFields: Set<string>,
  params: unknown[]
): string {
  const clauses: string[] = [];
  for (const f of filters) {
    assertAllowedField(f.field, allowedColumns, deniedFields);
    const col = quoteIdent(f.field);
    const idx = () => params.length + 1;
    switch (f.op) {
      case "eq":
        clauses.push(`${col}::text = $${idx()}`);
        params.push(String(f.value));
        break;
      case "neq":
        clauses.push(`${col}::text != $${idx()}`);
        params.push(String(f.value));
        break;
      case "contains":
        clauses.push(`${col}::text ILIKE $${idx()}`);
        params.push(`%${f.value}%`);
        break;
      case "in": {
        if (!Array.isArray(f.value) || f.value.length === 0) {
          throw new LiveQueryError(
            "`in` filter requires a non-empty array value"
          );
        }
        clauses.push(`${col}::text = ANY($${idx()}::text[])`);
        params.push(f.value.map(String));
        break;
      }
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        const cmp = { gt: ">", gte: ">=", lt: "<", lte: "<=" }[f.op];
        clauses.push(`(${col})::numeric ${cmp} $${idx()}`);
        params.push(f.value);
        break;
      }
    }
  }
  return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}

export function buildStructuredSql(
  config: SourceConfig,
  allowedColumns: string[],
  deniedFields: Set<string>,
  args: {
    filters: DslFilter[];
    sort_by?: string;
    sort_dir?: "asc" | "desc";
    limit: number;
    offset?: number;
  }
): Sql {
  const params: unknown[] = [];
  const where = buildWhere(args.filters, allowedColumns, deniedFields, params);

  let orderBy = `ORDER BY ${quoteIdent(config.primary_key)}`;
  if (args.sort_by) {
    assertAllowedField(args.sort_by, allowedColumns, deniedFields);
    // Natural column ordering (numeric columns sort numerically) — an
    // improvement over the mirror's text-only JSONB sort.
    const dir = args.sort_dir === "desc" ? "DESC" : "ASC";
    orderBy = `ORDER BY ${quoteIdent(args.sort_by)} ${dir} NULLS LAST`;
  }

  params.push(args.limit);
  let sql = `SELECT ${projection(config, allowedColumns)} FROM ${quoteQualified(config.table)} ${where} ${orderBy} LIMIT $${params.length}`;
  if (args.offset) {
    params.push(args.offset);
    sql += ` OFFSET $${params.length}`;
  }
  return { sql, params };
}

// Web-UI table browsing: optional keyword (ILIKE across all visible
// columns' text — same semantics as the mirror's ILIKE over
// structured_data::text), sortable, paginated.
export function buildBrowseSql(
  config: SourceConfig,
  allowedColumns: string[],
  deniedFields: Set<string>,
  args: {
    q?: string;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
    limit: number;
    offset: number;
  }
): { list: Sql; count: Sql } {
  const table = quoteQualified(config.table);
  const concat = `concat_ws(' ', ${allowedColumns
    .map((c) => `${quoteIdent(c)}::text`)
    .join(", ")})`;

  const whereParams: unknown[] = [];
  let where = "";
  if (args.q) {
    whereParams.push(`%${args.q}%`);
    where = `WHERE ${concat} ILIKE $1`;
  }

  let orderBy = `ORDER BY ${quoteIdent(config.primary_key)}`;
  if (
    args.sort_by &&
    args.sort_by !== "updated_at" &&
    args.sort_by !== "created_at"
  ) {
    assertAllowedField(args.sort_by, allowedColumns, deniedFields);
    const dir = args.sort_dir === "desc" ? "DESC" : "ASC";
    orderBy = `ORDER BY ${quoteIdent(args.sort_by)} ${dir} NULLS LAST`;
  }

  const listParams = [...whereParams, args.limit, args.offset];
  return {
    list: {
      sql: `SELECT ${projection(config, allowedColumns)} FROM ${table} ${where} ${orderBy} LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      params: listParams,
    },
    count: {
      sql: `SELECT COUNT(*)::int AS total FROM ${table} ${where}`,
      params: whereParams,
    },
  };
}

export function buildCountSql(
  config: SourceConfig,
  allowedColumns: string[],
  deniedFields: Set<string>,
  filters: DslFilter[]
): Sql {
  const params: unknown[] = [];
  const where = buildWhere(filters, allowedColumns, deniedFields, params);
  return {
    sql: `SELECT COUNT(*)::int AS total FROM ${quoteQualified(config.table)} ${where}`,
    params,
  };
}

export interface DslAggregation {
  op: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
  alias?: string;
}

export function buildAggregateSql(
  config: SourceConfig,
  allowedColumns: string[],
  deniedFields: Set<string>,
  args: {
    group_by?: string[];
    aggregations: DslAggregation[];
    filters?: DslFilter[];
    having?: Array<{
      alias: string;
      op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
      value: number;
    }>;
    order_by?: { alias: string; direction: "asc" | "desc" };
    limit: number;
  }
): { sql: string; params: unknown[]; aliases: Set<string> } {
  const aliasFor = (a: DslAggregation): string =>
    a.alias ?? (a.field ? `${a.op}_${a.field}` : "count");

  const aliases = new Set<string>();
  const selectParts: string[] = [];

  for (const g of args.group_by ?? []) {
    assertAllowedField(g, allowedColumns, deniedFields);
    // ::text keeps group keys JSON-friendly and consistent with the
    // mirror's structured_data->>'g' output shape.
    selectParts.push(`${quoteIdent(g)}::text AS ${quoteIdent(g)}`);
    aliases.add(g);
  }

  for (const a of args.aggregations) {
    const alias = aliasFor(a);
    if (aliases.has(alias)) {
      throw new LiveQueryError(`Duplicate alias '${alias}' in aggregations.`);
    }
    aliases.add(alias);

    if (a.op === "count") {
      if (a.field) {
        assertAllowedField(a.field, allowedColumns, deniedFields);
        selectParts.push(
          `COUNT(${quoteIdent(a.field)})::int AS ${quoteIdent(alias)}`
        );
      } else {
        selectParts.push(`COUNT(*)::int AS ${quoteIdent(alias)}`);
      }
    } else {
      if (!a.field) {
        throw new LiveQueryError(`${a.op} requires a field`);
      }
      assertAllowedField(a.field, allowedColumns, deniedFields);
      selectParts.push(
        `${a.op.toUpperCase()}((${quoteIdent(a.field)})::numeric) AS ${quoteIdent(alias)}`
      );
    }
  }

  const params: unknown[] = [];
  const where = buildWhere(args.filters ?? [], allowedColumns, deniedFields, params);

  let groupSql = "";
  if (args.group_by && args.group_by.length > 0) {
    groupSql = ` GROUP BY ${args.group_by.map((g) => quoteIdent(g)).join(", ")}`;
  }

  let havingSql = "";
  if (args.having && args.having.length > 0) {
    const clauses: string[] = [];
    for (const h of args.having) {
      if (!aliases.has(h.alias)) {
        throw new LiveQueryError(
          `having clause references unknown alias '${h.alias}'. Known: ${Array.from(aliases).join(", ")}`
        );
      }
      const cmp = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=" }[h.op];
      clauses.push(`${quoteIdent(h.alias)} ${cmp} $${params.length + 1}`);
      params.push(h.value);
    }
    havingSql = ` HAVING ${clauses.join(" AND ")}`;
  }

  let orderSql = "";
  if (args.order_by) {
    if (!aliases.has(args.order_by.alias)) {
      throw new LiveQueryError(
        `order_by references unknown alias '${args.order_by.alias}'`
      );
    }
    orderSql = ` ORDER BY ${quoteIdent(args.order_by.alias)} ${args.order_by.direction.toUpperCase()} NULLS LAST`;
  }

  params.push(args.limit);
  const sql = `SELECT ${selectParts.join(", ")} FROM ${quoteQualified(config.table)} ${where}${groupSql}${havingSql}${orderSql} LIMIT $${params.length}`;
  return { sql, params, aliases };
}

// Keyword search against the source, mirroring the FTS route's semantics:
// OR-matched tokens ranked by ts_rank, over every allowed column's text.
export function buildFullTextSql(
  config: SourceConfig,
  allowedColumns: string[],
  args: { query: string; limit: number }
): Sql {
  const cols = Array.from(new Set([config.primary_key, ...allowedColumns]));
  const concat = `concat_ws(' ', ${cols
    .map((c) => `${quoteIdent(c)}::text`)
    .join(", ")})`;
  const tsExpr = `to_tsvector('english', ${concat})`;

  const sql = `
    WITH q AS (
      SELECT to_tsquery(
        'english',
        NULLIF(replace(plainto_tsquery('english', $1)::text, '&', '|'), '')
      ) AS qq
    )
    SELECT ${projection(config, allowedColumns)},
           ts_rank(${tsExpr}, q.qq) AS __relevance
    FROM ${quoteQualified(config.table)}
    CROSS JOIN q
    WHERE q.qq IS NOT NULL AND ${tsExpr} @@ q.qq
    ORDER BY __relevance DESC
    LIMIT $2`;
  return { sql, params: [args.query, args.limit] };
}

export function buildReadRowSql(
  config: SourceConfig,
  allowedColumns: string[],
  sourceRowId: string
): Sql {
  return {
    sql: `SELECT ${projection(config, allowedColumns)} FROM ${quoteQualified(config.table)} WHERE ${quoteIdent(config.primary_key)}::text = $1 LIMIT 1`,
    params: [sourceRowId],
  };
}

// ── Row shaping ─────────────────────────────────────────────────────────
// Live rows are shaped like entries so agents, the web UI, and the MCP
// client treat both modes uniformly. The synthetic id encodes everything
// needed to re-fetch the row live: `live_<collectionId>_<sourceRowId>`.

export function liveEntryId(collectionId: string, sourceRowId: string): string {
  return `live_${collectionId}_${sourceRowId}`;
}

export function parseLiveEntryId(
  id: string
): { collectionId: string; sourceRowId: string } | null {
  const m = id.match(
    /^live_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(.+)$/i
  );
  if (!m) return null;
  return { collectionId: m[1], sourceRowId: m[2] };
}

export function shapeLiveRow(
  row: Record<string, unknown>,
  collection: LiveCollectionRef,
  allowedColumns: string[]
): Record<string, unknown> {
  const config = collection.source_config;
  const pkValue = String(row[config.primary_key]);

  const structured: Record<string, unknown> = {};
  for (const col of allowedColumns) {
    if (col === config.content_column) continue;
    if (col in row) structured[col] = row[col];
  }

  const content =
    config.content_column && allowedColumns.includes(config.content_column)
      ? row[config.content_column] == null
        ? null
        : String(row[config.content_column])
      : null;

  return {
    id: liveEntryId(collection.id, pkValue),
    collection_id: collection.id,
    workspace_id: collection.workspace_id,
    structured_data: structured,
    content,
    source_row_id: pkValue,
    live: true,
    // Entry-shape compatibility. Live rows have no Prismian-side history.
    version: 1,
    created_at: null,
    updated_at: null,
    created_by: null,
    created_by_agent: null,
  };
}

// ── Executors ───────────────────────────────────────────────────────────

export async function runLiveSql(
  connectionString: string,
  built: Sql
): Promise<Record<string, unknown>[]> {
  return readOnlyQuery(
    connectionString,
    LIVE_STATEMENT_TIMEOUT_MS,
    built.sql,
    built.params
  );
}

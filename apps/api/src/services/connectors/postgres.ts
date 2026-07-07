import pg from "pg";
import type { DataSourceTable, SourceConfig } from "../../shared/index.js";

const MAX_ROWS_PER_SYNC = Number(process.env.CONNECTOR_MAX_ROWS) || 10_000;
const INTROSPECT_STATEMENT_TIMEOUT_MS = 10_000;
const SYNC_STATEMENT_TIMEOUT_MS = 60_000;

export interface SourceRow {
  source_row_id: string;
  structured_data: Record<string, unknown>;
  content: string | null;
}

export interface SyncedRows {
  rows: SourceRow[];
  row_count: number;
  truncated: boolean;
}

// Decide what TLS config to pass to pg for a given connection string.
// Two cases users actually hit:
//
// 1. Supabase pooler (`*.pooler.supabase.com`) presents a cert chain that
//    Node's bundled CA store doesn't include — we get
//    SELF_SIGNED_CERT_IN_CHAIN at handshake. We disable verification for
//    those hosts. The connection is still encrypted; we just don't pin
//    the issuer.
// 2. The user explicitly opted into relaxed verification by setting
//    `sslmode=no-verify` in the URL (libpq syntax, doesn't natively work
//    with node-postgres but we accept it as a hint).
//
// Everything else uses pg's defaults — TLS is on if the URL says so,
// off otherwise.
function sslConfigFor(connectionString: string): boolean | { rejectUnauthorized: boolean } {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return false;
  }
  const sslmode = url.searchParams.get("sslmode");
  const isSupabasePooler =
    /\.pooler\.supabase\.com$/i.test(url.hostname) ||
    /\.supabase\.co$/i.test(url.hostname);

  if (sslmode === "no-verify" || sslmode === "allow") {
    return { rejectUnauthorized: false };
  }
  if (isSupabasePooler) {
    return { rejectUnauthorized: false };
  }
  // Fall through to pg's defaults (true if sslmode=require/verify-*, else
  // unset).
  return false;
}

export async function withClient<T>(
  connectionString: string,
  timeoutMs: number,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const ssl = sslConfigFor(connectionString);
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
    statement_timeout: timeoutMs,
    ...(ssl ? { ssl } : {}),
  } as pg.PoolConfig);
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}

export class ConnectorPrivilegeError extends Error {
  code = "connector_privilege_too_high";
  privileges: {
    rolsuper: boolean;
    rolcreaterole: boolean;
    rolcreatedb: boolean;
    rolbypassrls: boolean;
  };
  constructor(privileges: ConnectorPrivilegeError["privileges"]) {
    super(
      "Connector refuses high-privilege role. Provision a dedicated read-only user " +
        "(no SUPERUSER, CREATEROLE, CREATEDB, or BYPASSRLS)."
    );
    this.privileges = privileges;
  }
}

// Hard-fail if the supplied credentials are superuser or otherwise privileged
// enough to bypass RLS / create accounts. We do this before doing any real
// work so a paste of production admin creds can never succeed. Users must
// provision a dedicated read-only role.
async function assertLowPrivilegeRole(client: pg.PoolClient): Promise<void> {
  const result = await client.query<{
    rolsuper: boolean;
    rolcreaterole: boolean;
    rolcreatedb: boolean;
    rolbypassrls: boolean;
  }>(
    `SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
     FROM pg_roles WHERE rolname = current_user`
  );
  const row = result.rows[0];
  if (!row) {
    // current_user not in pg_roles should not happen on a live session, but
    // err on the safe side and reject rather than assume benign.
    throw new ConnectorPrivilegeError({
      rolsuper: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolbypassrls: false,
    });
  }
  if (row.rolsuper || row.rolcreaterole || row.rolcreatedb || row.rolbypassrls) {
    throw new ConnectorPrivilegeError(row);
  }
}

// Postgres identifier quoting. We already validated via Zod regex upstream,
// but we quote defensively. Supports optional schema.table form.
export function quoteQualified(name: string): string {
  const parts = name.split(".");
  return parts.map((p) => `"${p.replace(/"/g, '""')}"`).join(".");
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function testConnection(connectionString: string): Promise<void> {
  await withClient(connectionString, 5_000, async (client) => {
    await client.query("SELECT 1");
    await assertLowPrivilegeRole(client);
  });
}

// Run one SELECT against the source inside a READ ONLY transaction. Used by
// live query mode. Three independent write-protections stack here:
//   1. assertLowPrivilegeRole — refuses privileged roles at connect time
//      (and users are told to provision a read-only role anyway);
//   2. the transaction is READ ONLY — Postgres itself rejects any write;
//   3. callers only ever build SELECTs from the closed query DSL.
export async function readOnlyQuery(
  connectionString: string,
  timeoutMs: number,
  sql: string,
  params: unknown[]
): Promise<Record<string, unknown>[]> {
  return withClient(connectionString, timeoutMs, async (client) => {
    await assertLowPrivilegeRole(client);
    await client.query("BEGIN TRANSACTION READ ONLY");
    try {
      const result = await client.query(sql, params);
      await client.query("COMMIT");
      return result.rows;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
}

export async function introspect(
  connectionString: string
): Promise<DataSourceTable[]> {
  return withClient(
    connectionString,
    INTROSPECT_STATEMENT_TIMEOUT_MS,
    async (client) => {
      await assertLowPrivilegeRole(client);
      const tables = await client.query<{
        table_schema: string;
        table_name: string;
      }>(
        `SELECT table_schema, table_name
         FROM information_schema.tables
         WHERE table_type = 'BASE TABLE'
           AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         ORDER BY table_schema, table_name`
      );

      if (tables.rows.length === 0) return [];

      const columns = await client.query<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        `SELECT table_schema, table_name, column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         ORDER BY table_schema, table_name, ordinal_position`
      );

      const pks = await client.query<{
        table_schema: string;
        table_name: string;
        column_name: string;
      }>(
        `SELECT kcu.table_schema, kcu.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         INNER JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')`
      );

      const pkSet = new Set(
        pks.rows.map(
          (r) => `${r.table_schema}.${r.table_name}.${r.column_name}`
        )
      );

      const result: DataSourceTable[] = tables.rows.map((t) => ({
        schema: t.table_schema,
        name: t.table_name,
        columns: columns.rows
          .filter(
            (c) =>
              c.table_schema === t.table_schema &&
              c.table_name === t.table_name
          )
          .map((c) => ({
            name: c.column_name,
            data_type: c.data_type,
            is_nullable: c.is_nullable === "YES",
            is_primary_key: pkSet.has(
              `${c.table_schema}.${c.table_name}.${c.column_name}`
            ),
          })),
      }));
      return result;
    }
  );
}

export async function readRows(
  connectionString: string,
  config: SourceConfig
): Promise<SyncedRows> {
  return withClient(
    connectionString,
    SYNC_STATEMENT_TIMEOUT_MS,
    async (client) => {
      await assertLowPrivilegeRole(client);
      const cols = Array.from(new Set([config.primary_key, ...config.columns]));
      const selectList = cols.map(quoteIdent).join(", ");
      const sql = `SELECT ${selectList} FROM ${quoteQualified(config.table)} LIMIT $1`;

      const result = await client.query(sql, [MAX_ROWS_PER_SYNC + 1]);
      const truncated = result.rows.length > MAX_ROWS_PER_SYNC;
      const rows = result.rows.slice(0, MAX_ROWS_PER_SYNC);

      // Skip rows with a null row-id rather than failing the whole sync. A
      // few rows with NULL in the chosen column shouldn't prevent the rest
      // of the table from coming through. We log the count so the user can
      // see it in the audit / sync error fields.
      let skippedNullRowId = 0;
      const synced: SourceRow[] = [];
      for (const row of rows) {
        const pkVal = row[config.primary_key];
        if (pkVal === null || pkVal === undefined) {
          skippedNullRowId++;
          continue;
        }
        const sourceRowId = String(pkVal);

        const structured: Record<string, unknown> = {};
        for (const col of config.columns) {
          if (col === config.content_column) continue;
          structured[col] = row[col];
        }

        const content =
          config.content_column != null
            ? row[config.content_column] == null
              ? null
              : String(row[config.content_column])
            : null;

        synced.push({
          source_row_id: sourceRowId,
          structured_data: structured,
          content,
        });
      }

      if (skippedNullRowId > 0) {
        console.warn(
          `[connector] ${config.table}: skipped ${skippedNullRowId} row(s) ` +
            `with NULL ${config.primary_key}`
        );
      }

      return { rows: synced, row_count: synced.length, truncated };
    }
  );
}

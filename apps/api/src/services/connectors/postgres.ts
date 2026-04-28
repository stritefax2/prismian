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

async function withClient<T>(
  connectionString: string,
  timeoutMs: number,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
    statement_timeout: timeoutMs,
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
function quoteQualified(name: string): string {
  const parts = name.split(".");
  return parts.map((p) => `"${p.replace(/"/g, '""')}"`).join(".");
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function testConnection(connectionString: string): Promise<void> {
  await withClient(connectionString, 5_000, async (client) => {
    await client.query("SELECT 1");
    await assertLowPrivilegeRole(client);
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

      const synced: SourceRow[] = rows.map((row) => {
        const pkVal = row[config.primary_key];
        if (pkVal === null || pkVal === undefined) {
          throw new Error(
            `Row in ${config.table} has null primary_key (${config.primary_key})`
          );
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

        return {
          source_row_id: sourceRowId,
          structured_data: structured,
          content,
        };
      });

      return { rows: synced, row_count: synced.length, truncated };
    }
  );
}

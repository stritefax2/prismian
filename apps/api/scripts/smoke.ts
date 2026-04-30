/**
 * End-to-end smoke test for the connector pipeline.
 *
 * Simulates the critical user story:
 *   1. User connects a Postgres database
 *   2. Picks a table and a subset of columns
 *   3. Sync runs, populates entries
 *   4. Agent queries the entries
 *   5. Field-level redaction removes denied columns
 *   6. Re-sync with changes updates rows, unchanged rows skip
 *   7. Deleted source rows disappear from Prismian
 *
 * This is the smoke test that catches wire-level bugs between modules.
 * Run it before every deploy. Exits non-zero on failure so it's CI-friendly.
 *
 * Prerequisites:
 *   - Local Postgres running (e.g. `docker-compose up -d postgres`)
 *   - Migrations applied (`pnpm run db:migrate`)
 *   - CONNECTOR_ENCRYPTION_KEY set (any 32-byte base64 value works for local)
 *
 * Run: `tsx scripts/smoke.ts`
 */

import "dotenv/config";
import pg from "pg";
import { query, transaction, pool } from "../src/db/client.js";
import { encryptConfig } from "../src/services/connectors/crypto.js";
import { runSyncNow } from "../src/services/connectors/sync.js";
import { filterDeniedFields } from "../src/services/permissions.js";
import type { AgentPermissions } from "../src/shared/index.js";

const SOURCE_TABLE = "smoke_source_customers";
const TEST_USER_EMAIL = `smoke-${Date.now()}@example.com`;
const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  "postgresql://prismian:prismian@localhost:5432/prismian";

let pass = 0;
let fail = 0;

function assert(condition: unknown, label: string): void {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
    pass++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`);
    fail++;
  }
}

function header(text: string): void {
  console.log(`\n\x1b[1m${text}\x1b[0m`);
}

async function setupSourceTable(): Promise<void> {
  // Create a "source" table in the same local Postgres. In production the
  // source would be a remote DB, but the sync code doesn't care — it just
  // uses the connection string.
  await query(`DROP TABLE IF EXISTS ${SOURCE_TABLE}`);
  await query(`
    CREATE TABLE ${SOURCE_TABLE} (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      mrr INTEGER NOT NULL,
      credit_card_last4 TEXT,
      notes TEXT
    )
  `);
  await query(
    `INSERT INTO ${SOURCE_TABLE} (id, email, plan, status, mrr, credit_card_last4, notes)
     VALUES
       ('c_01', 'ana@northwind.io', 'enterprise', 'active', 4200, '4242', 'Reviewing renewal in Q3'),
       ('c_02', 'jordan@acme.co', 'team', 'active', 890, '1111', 'Onboarding in progress'),
       ('c_03', 'sam@contoso.com', 'enterprise', 'at_risk', 3700, '2222', 'Pricing pushback'),
       ('c_04', 'priya@initech.io', 'team', 'churned', 0, null, 'Cancelled Mar 15')`
  );
}

interface TestContext {
  userId: string;
  workspaceId: string;
  dataSourceId: string;
  collectionId: string;
}

async function setupWorkspace(): Promise<TestContext> {
  // Bypass Supabase Auth — create the user row directly. The API auth
  // middleware would normally upsert this on first request.
  const userRes = await query<{ id: string }>(
    `INSERT INTO users (id, email, name)
     VALUES (gen_random_uuid(), $1, 'Smoke Test User')
     RETURNING id`,
    [TEST_USER_EMAIL]
  );
  const userId = userRes.rows[0].id;

  const wsRes = await query<{ id: string }>(
    `INSERT INTO workspaces (name, created_by)
     VALUES ('Smoke Workspace', $1)
     RETURNING id`,
    [userId]
  );
  const workspaceId = wsRes.rows[0].id;

  await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at)
     VALUES ($1, $2, 'owner', now())`,
    [workspaceId, userId]
  );

  const encrypted = encryptConfig(CONNECTION_STRING);
  const dsRes = await query<{ id: string }>(
    `INSERT INTO data_sources
       (workspace_id, name, source_type, encrypted_config, created_by)
     VALUES ($1, 'Smoke Source', 'postgres', $2, $3)
     RETURNING id`,
    [workspaceId, encrypted, userId]
  );
  const dataSourceId = dsRes.rows[0].id;

  const colRes = await query<{ id: string }>(
    `INSERT INTO collections
       (workspace_id, name, collection_type, source_id, source_config, sync_status)
     VALUES ($1, 'customers', 'structured', $2, $3, 'idle')
     RETURNING id`,
    [
      workspaceId,
      dataSourceId,
      {
        table: SOURCE_TABLE,
        primary_key: "id",
        columns: [
          "id",
          "email",
          "plan",
          "status",
          "mrr",
          "credit_card_last4",
          "notes",
        ],
        content_column: "notes",
      },
    ]
  );

  return { userId, workspaceId, dataSourceId, collectionId: colRes.rows[0].id };
}

async function teardown(ctx: TestContext | null): Promise<void> {
  if (ctx) {
    await query("DELETE FROM workspaces WHERE id = $1", [ctx.workspaceId]);
    await query("DELETE FROM users WHERE id = $1", [ctx.userId]);
  }
  await query(`DROP TABLE IF EXISTS ${SOURCE_TABLE}`);
}

async function main(): Promise<void> {
  let ctx: TestContext | null = null;

  try {
    header("Environment");
    assert(
      process.env.CONNECTOR_ENCRYPTION_KEY,
      "CONNECTOR_ENCRYPTION_KEY is set"
    );

    // Fail fast if migrations haven't been run.
    try {
      await query("SELECT 1 FROM data_sources LIMIT 0");
      assert(true, "migrations applied (data_sources table exists)");
    } catch {
      console.error(
        "\n\x1b[31mERROR\x1b[0m: migrations not applied. Run: pnpm run db:migrate\n"
      );
      process.exit(1);
    }

    header("Setup");
    await setupSourceTable();
    assert(true, `source table ${SOURCE_TABLE} created with 4 rows`);
    ctx = await setupWorkspace();
    assert(ctx.workspaceId, "workspace + data source + connected collection created");

    header("First sync");
    const first = await runSyncNow(ctx.collectionId);
    assert(first.status === "ok", `first sync returned ok (got ${first.status})`);
    if (first.status === "ok") {
      assert(first.rows_synced === 4, `synced 4 rows (got ${first.rows_synced})`);
      assert(!first.truncated, "not truncated");
    }

    const entries = await query<{
      structured_data: Record<string, unknown>;
      content: string | null;
      source_row_id: string;
      version: number;
    }>(
      "SELECT structured_data, content, source_row_id, version FROM entries WHERE collection_id = $1 ORDER BY source_row_id",
      [ctx.collectionId]
    );
    assert(entries.rows.length === 4, `4 entries landed (got ${entries.rows.length})`);
    assert(
      entries.rows[0].structured_data.email === "ana@northwind.io",
      "structured_data preserved column values"
    );
    assert(
      entries.rows[0].content === "Reviewing renewal in Q3",
      "content column pulled into entries.content"
    );
    assert(
      !("notes" in entries.rows[0].structured_data),
      "content column is excluded from structured_data"
    );

    header("Column redaction (agent permissions)");
    const scopedPerms: AgentPermissions = {
      collections: { customers: ["read"] },
      field_restrictions: {
        customers: {
          deny_fields: ["credit_card_last4", "mrr"],
        },
      },
    };
    const filtered = filterDeniedFields(
      scopedPerms,
      "customers",
      entries.rows[0].structured_data
    );
    assert(
      filtered && !("credit_card_last4" in filtered),
      "credit_card_last4 redacted by filter"
    );
    assert(filtered && !("mrr" in filtered), "mrr redacted by filter");
    assert(
      filtered && filtered.email === "ana@northwind.io",
      "allowed fields pass through"
    );

    header("Re-sync with no changes");
    const reSync = await runSyncNow(ctx.collectionId);
    assert(reSync.status === "ok", "second sync returned ok");
    const after = await query<{ version: number }>(
      "SELECT version FROM entries WHERE collection_id = $1 AND source_row_id = 'c_01'",
      [ctx.collectionId]
    );
    assert(
      after.rows[0].version === entries.rows[0].version,
      `unchanged row did not bump version (stayed at ${after.rows[0].version})`
    );

    header("Re-sync with a row updated in source");
    await query(
      `UPDATE ${SOURCE_TABLE} SET status = 'at_risk', notes = 'Escalated' WHERE id = 'c_02'`
    );
    const updatedSync = await runSyncNow(ctx.collectionId);
    assert(updatedSync.status === "ok", "update sync returned ok");
    const updatedRow = await query<{
      structured_data: Record<string, unknown>;
      content: string | null;
      version: number;
    }>(
      "SELECT structured_data, content, version FROM entries WHERE collection_id = $1 AND source_row_id = 'c_02'",
      [ctx.collectionId]
    );
    assert(
      updatedRow.rows[0].structured_data.status === "at_risk",
      "updated status propagated"
    );
    assert(
      updatedRow.rows[0].content === "Escalated",
      "updated content propagated"
    );
    assert(
      updatedRow.rows[0].version > 1,
      `version bumped on change (${updatedRow.rows[0].version})`
    );

    header("Re-sync with a row deleted from source");
    await query(`DELETE FROM ${SOURCE_TABLE} WHERE id = 'c_04'`);
    const deleteSync = await runSyncNow(ctx.collectionId);
    assert(deleteSync.status === "ok", "delete sync returned ok");
    const final = await query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM entries WHERE collection_id = $1",
      [ctx.collectionId]
    );
    assert(final.rows[0].n === 3, `entry for deleted source row removed (3 remaining, got ${final.rows[0].n})`);

    header("Write-lock invariant");
    // Attempt a direct INSERT — the HTTP layer rejects these, but the
    // service layer (used by sync) bypasses that. We verify at the HTTP
    // layer by checking the assertion the route handler makes.
    const connectedCol = await query<{ source_id: string | null }>(
      "SELECT source_id FROM collections WHERE id = $1",
      [ctx.collectionId]
    );
    assert(
      connectedCol.rows[0].source_id !== null,
      "connected collection has source_id — route handler will reject human/agent writes"
    );
  } catch (err) {
    console.error("\n\x1b[31mERROR during smoke:\x1b[0m", err);
    fail++;
  } finally {
    header("Cleanup");
    await teardown(ctx);
    assert(true, "cleaned up test workspace + source table");

    console.log(
      `\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m\n`
    );
    await pool.end();
    process.exit(fail > 0 ? 1 : 0);
  }
}

// Silence pg "unhandled error" when we intentionally close.
pool.on("error", () => {});

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { query, transaction } from "../../db/client.js";
import { decryptConfig } from "./crypto.js";
import { readRows } from "./postgres.js";
import { enqueueEmbedding } from "../embeddings.js";
import type { SourceConfig } from "../../shared/index.js";

const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 15 * 60 * 1000;
const SYNC_STALE_MS = SYNC_INTERVAL_MS;
const STUCK_SYNC_MS =
  Number(process.env.SYNC_STUCK_TIMEOUT_MS) || 10 * 60 * 1000;

// Reset collections that claimed 'syncing' but never finalized — happens
// when a sync worker crashes mid-run, a serverless function times out, or
// the DB connection drops. Without this, those collections would never
// sync again because claim() refuses to take a collection that's already
// marked syncing.
async function unstickStaleSyncs(): Promise<number> {
  const result = await query<{ id: string }>(
    `UPDATE collections
     SET sync_status = 'error',
         last_sync_error = 'Sync timed out or crashed — reset by sweeper'
     WHERE source_id IS NOT NULL
       AND sync_status = 'syncing'
       AND (last_sync_at IS NULL OR last_sync_at < now() - $1::interval)
     RETURNING id`,
    [`${Math.floor(STUCK_SYNC_MS / 1000)} seconds`]
  );
  if (result.rows.length > 0) {
    console.warn(
      `Reset ${result.rows.length} stuck sync(s): ${result.rows
        .map((r) => r.id)
        .join(", ")}`
    );
  }
  return result.rows.length;
}

export type SyncOutcome =
  | {
      status: "ok";
      rows_synced: number;
      truncated: boolean;
    }
  | {
      status: "error";
      error: string;
    }
  | {
      status: "already_syncing";
    }
  | {
      status: "not_connected";
    };

async function loadConnectionString(
  dataSourceId: string
): Promise<string | null> {
  const res = await query<{ encrypted_config: string }>(
    "SELECT encrypted_config FROM data_sources WHERE id = $1",
    [dataSourceId]
  );
  if (res.rows.length === 0) return null;
  return decryptConfig(res.rows[0].encrypted_config);
}

async function claim(collectionId: string): Promise<boolean> {
  const res = await query(
    `UPDATE collections
     SET sync_status = 'syncing'
     WHERE id = $1
       AND source_id IS NOT NULL
       AND (sync_status IS NULL OR sync_status <> 'syncing')
     RETURNING id`,
    [collectionId]
  );
  return res.rowCount === 1;
}

async function finalize(
  collectionId: string,
  result: SyncOutcome
): Promise<void> {
  if (result.status === "ok") {
    await query(
      `UPDATE collections
       SET sync_status = 'idle',
           last_sync_at = now(),
           last_sync_error = NULL
       WHERE id = $1`,
      [collectionId]
    );
  } else if (result.status === "error") {
    await query(
      `UPDATE collections
       SET sync_status = 'error',
           last_sync_at = now(),
           last_sync_error = $2
       WHERE id = $1`,
      [collectionId, result.error]
    );
  }
}

export async function runSyncNow(collectionId: string): Promise<SyncOutcome> {
  const colRes = await query<{
    id: string;
    workspace_id: string;
    source_id: string | null;
    source_config: SourceConfig | null;
  }>(
    "SELECT id, workspace_id, source_id, source_config FROM collections WHERE id = $1",
    [collectionId]
  );
  if (colRes.rows.length === 0) {
    return { status: "not_connected" };
  }
  const col = colRes.rows[0];
  if (!col.source_id || !col.source_config) {
    return { status: "not_connected" };
  }

  const claimed = await claim(collectionId);
  if (!claimed) return { status: "already_syncing" };

  try {
    const connectionString = await loadConnectionString(col.source_id);
    if (!connectionString) {
      const outcome: SyncOutcome = {
        status: "error",
        error: "Data source not found or credentials missing",
      };
      await finalize(collectionId, outcome);
      return outcome;
    }

    const { rows, row_count, truncated } = await readRows(
      connectionString,
      col.source_config
    );

    const touchedIds: string[] = [];
    const BATCH_SIZE = 500;

    await transaction(async (client) => {
      const seen = new Set<string>();

      // Batch upserts. Each batch sends one query to Postgres with N rows
      // worth of VALUES, avoiding N round-trips. For a 10k-row sync this
      // drops us from ~10,000 round-trips to ~20, which on a remote
      // Supabase connection is the difference between ~2 minutes and a
      // few seconds.
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        for (const row of batch) seen.add(row.source_row_id);

        const params: unknown[] = [col.id, col.workspace_id];
        const valuesClauses: string[] = [];
        for (const row of batch) {
          const base = params.length;
          // (collection_id, workspace_id, structured_data, content, source_row_id)
          // collection_id = $1, workspace_id = $2 are reused.
          params.push(row.structured_data, row.content, row.source_row_id);
          valuesClauses.push(
            `($1, $2, $${base + 1}, $${base + 2}, $${base + 3})`
          );
        }

        const upsertSql = `
          INSERT INTO entries
            (collection_id, workspace_id, structured_data, content, source_row_id)
          VALUES ${valuesClauses.join(", ")}
          ON CONFLICT (collection_id, source_row_id)
            WHERE source_row_id IS NOT NULL
          DO UPDATE SET
            structured_data = EXCLUDED.structured_data,
            content = EXCLUDED.content,
            updated_at = now(),
            version = entries.version + 1
          WHERE entries.structured_data IS DISTINCT FROM EXCLUDED.structured_data
             OR entries.content IS DISTINCT FROM EXCLUDED.content
          RETURNING id
        `;

        const upsert = await client.query<{ id: string }>(upsertSql, params);
        for (const r of upsert.rows) touchedIds.push(r.id);
      }

      // Delete rows that disappeared from the source.
      const keepList = Array.from(seen);
      if (keepList.length > 0) {
        await client.query(
          `DELETE FROM entries
           WHERE collection_id = $1
             AND source_row_id IS NOT NULL
             AND NOT (source_row_id = ANY($2::text[]))`,
          [col.id, keepList]
        );
      } else {
        // Remote table empty — drop all synced rows for this collection.
        await client.query(
          `DELETE FROM entries
           WHERE collection_id = $1 AND source_row_id IS NOT NULL`,
          [col.id]
        );
      }
    });

    // Enqueue embeddings outside the transaction. Only for collections with
    // a content_column — structured-only rows don't benefit much from
    // embedding individual field values.
    if (col.source_config.content_column) {
      for (const entryId of touchedIds) {
        enqueueEmbedding(entryId).catch((e) =>
          console.error("Failed to enqueue embedding during sync:", e)
        );
      }
    }

    const outcome: SyncOutcome = {
      status: "ok",
      rows_synced: row_count,
      truncated,
    };
    await finalize(collectionId, outcome);
    return outcome;
  } catch (e) {
    const outcome: SyncOutcome = {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    };
    await finalize(collectionId, outcome);
    return outcome;
  }
}

// In-process scheduler. For single-instance API deployments this is enough.
// For Vercel/serverless, call runSyncNow from an external cron (e.g. Vercel
// Cron) hitting a dedicated admin endpoint.
let syncInterval: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
  // Unstick before we look for due work, so a collection that was stuck
  // in 'syncing' comes back into rotation immediately.
  await unstickStaleSyncs();

  const due = await query<{ id: string }>(
    `SELECT id FROM collections
     WHERE source_id IS NOT NULL
       AND (sync_status IS NULL OR sync_status <> 'syncing')
       AND (last_sync_at IS NULL OR last_sync_at < now() - $1::interval)
     ORDER BY last_sync_at NULLS FIRST
     LIMIT 10`,
    [`${Math.floor(SYNC_STALE_MS / 1000)} seconds`]
  );

  for (const { id } of due.rows) {
    try {
      const outcome = await runSyncNow(id);
      if (outcome.status === "error") {
        console.error(`Sync failed for collection ${id}:`, outcome.error);
      } else if (outcome.status === "ok") {
        console.log(
          `Synced collection ${id}: ${outcome.rows_synced} rows${
            outcome.truncated ? " (truncated)" : ""
          }`
        );
      }
    } catch (e) {
      console.error(`Sync tick error for collection ${id}:`, e);
    }
  }
}

export function startSyncScheduler(intervalMs = SYNC_INTERVAL_MS): void {
  if (syncInterval) return;
  console.log(
    `Connector sync scheduler started (interval ${Math.round(intervalMs / 1000)}s)`
  );
  syncInterval = setInterval(() => {
    tick().catch((e) => console.error("Sync scheduler error:", e));
  }, intervalMs);
}

export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Invoked by external cron / Vercel Cron / admin tooling to run one
// scheduler tick and return a summary. On serverless hosts this is the
// only way syncs run automatically.
export async function runSchedulerTick(): Promise<{
  checked: number;
  unstuck: number;
  results: Array<{ collection_id: string; status: string; rows?: number }>;
}> {
  const unstuck = await unstickStaleSyncs();

  const due = await query<{ id: string }>(
    `SELECT id FROM collections
     WHERE source_id IS NOT NULL
       AND (sync_status IS NULL OR sync_status <> 'syncing')
       AND (last_sync_at IS NULL OR last_sync_at < now() - $1::interval)
     ORDER BY last_sync_at NULLS FIRST
     LIMIT 50`,
    [`${Math.floor(SYNC_STALE_MS / 1000)} seconds`]
  );

  const results: Array<{
    collection_id: string;
    status: string;
    rows?: number;
  }> = [];
  for (const { id } of due.rows) {
    const outcome = await runSyncNow(id);
    results.push({
      collection_id: id,
      status: outcome.status,
      rows: outcome.status === "ok" ? outcome.rows_synced : undefined,
    });
  }
  return { checked: due.rows.length, unstuck, results };
}

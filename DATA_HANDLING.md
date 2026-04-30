# Data handling

The short version of what Prismian reads, stores, logs, and — most
importantly — what it does not touch. If you're evaluating Prismian for
your team, this is the page to read first.

## What leaves your database

When you connect a Postgres source, Prismian runs exactly three kinds of
query against it:

1. **`SELECT 1`** on connect, to confirm the connection works.
2. **A privilege check**: `SELECT rolsuper, rolcreaterole, rolcreatedb,
   rolbypassrls FROM pg_roles WHERE rolname = current_user`. If any are
   `true`, we refuse the connection outright. We want a scoped
   read-only role, not a superuser.
3. **Schema + column introspection** against `information_schema.tables`
   / `information_schema.columns` / `pg_catalog` when you click
   "introspect." This lists tables and columns so you can pick which
   ones to expose. We do not read table _contents_ here.

After you pick tables + columns to expose, a scheduled sync (every 15
minutes by default, configurable via `SYNC_INTERVAL_MS`) issues a
straight `SELECT <your-selected-columns> FROM <your-selected-table>
LIMIT 10001` against your database. That's it. No `pg_stat_*`, no
database-wide scans, no writes, no DDL, no event triggers, no
`pg_dump`, no `COPY`.

Per-sync row ceiling is `CONNECTOR_MAX_ROWS` (default 10,000). Queries
run with `statement_timeout` set at the connection level (10s for
introspect, 60s for sync), so a runaway Prismian sync can't wedge your
database.

**Strongly recommended**: provision a dedicated read-only role. The
connector UI prints the exact SQL, but it's:

```sql
CREATE ROLE prismian_readonly WITH LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE your_db TO prismian_readonly;
GRANT USAGE ON SCHEMA public TO prismian_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO prismian_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO prismian_readonly;
```

The connector rejects superuser, `CREATEROLE`, `CREATEDB`, and
`BYPASSRLS` roles on both initial connect and every subsequent sync.

## What Prismian stores

In Prismian's own Postgres database:

- **Synced rows**, one row per source row, into an `entries` table as
  JSONB. Only the columns you selected when you created the collection
  are mirrored. Columns you did not select are never read, never stored.
- **Connection strings**, AES-256-GCM encrypted with
  `CONNECTOR_ENCRYPTION_KEY` (a server-side secret you generate). They
  are never returned to the browser or to any agent. If you lose the
  encryption key, we can't decrypt them — you'd re-enter the
  connection string.
- **Workspace metadata**: members, roles, invites, agent keys (SHA-256
  hashed — we never store the raw key), audit log, collections, source
  configs.
- **Optional embeddings**: if you configure an `OPENAI_API_KEY`, content
  columns are sent to OpenAI's `text-embedding-3-small` endpoint so
  agents can use semantic search. If you don't want any data leaving
  for embeddings, leave `OPENAI_API_KEY` unset and search falls back to
  Postgres full-text. No content is ever sent to OpenAI for chat
  completion — Prismian doesn't run an LLM.

## What leaves Prismian

For an agent query over MCP: the rows your agent key is allowed to
read, with denied fields stripped out on the server before the
response is serialized. Redaction is enforced in one place, in
`filterDeniedFields`, and every read route calls it (including
`/collections/:id/entries` and `/entries/:id/versions` — the two paths
most commonly missed in this kind of product).

Writes from agents only land in _native_ collections. Writes to
connected collections — the mirrored tables from your source DB —
return `409 read_only_source` at the top of the handler, before any
permission check. This is structural: a permissions bug can't route
around it.

## What we log

Every read, write, and admin action by a user or an agent key goes into
`audit_log`:

- actor (user id or agent key id)
- action (read / create / update / delete / …)
- resource type and id
- workspace id
- timestamp
- optional JSON metadata

You can query this log via `GET /api/v1/audit/:workspaceId` or read the
table directly. There is no hidden telemetry. Prismian does not call
home.

## Rate and volume limits

Each agent key carries its own limits (set when you create the key):

- `max_results_per_query` — caps how many rows a single tool call can
  return. Enforced on every read route.
- `allowed_query_types` — restrict a key to `semantic`, `fulltext`,
  and/or `structured`.
- `max_entries_per_hour` — caps how many _writes_ an agent can make to
  native collections in a rolling hour.
- `can_delete`, `require_review` — further write guards.

Collection-level access and per-column deny lists are set at the same
time. Full reference in `packages/shared/src/schemas.ts`.

## Killing access

Three ways, each takes about one click:

1. **Revoke a single agent key** — Settings → Agent Keys → Revoke. The
   key's hash is deleted. Any AI tool using it gets 401 on its next
   call; there's nothing cached to keep working.
2. **Disconnect a source** — Settings → Data Sources → Remove. All
   connected collections derived from that source and their mirrored
   rows are deleted with `ON DELETE CASCADE`. Your source database
   is untouched.
3. **Delete the workspace** — via the API (`DELETE
   /api/v1/workspaces/:id`; a UI button is coming). Every row owned by
   the workspace is cascaded: collections, entries, agent keys, audit
   log, versions, data sources. Your source DB is untouched.

## What Prismian is _not_

- Not a write path back to your source database. Ever.
- Not a query passthrough. Agent queries hit Prismian's mirror, not
  yours.
- Not a replication tool — 15-minute sync, not real-time CDC.
- Not a data warehouse. Row caps are deliberate.
- Not a chat product. We expose MCP tools; the chat UI is Claude /
  Cursor / ChatGPT / whatever.

## Hosted vs self-host

If you're on Prismian Cloud:

- We run the API and the web app on Vercel and the Postgres + auth on
  Supabase. Data residency: US (Supabase project in us-east-1). Happy
  to discuss EU residency for design partners.
- `CONNECTOR_ENCRYPTION_KEY` lives only in the API's env. Your source
  DB's connection string is encrypted with it at rest.
- Only you and workspace members you invite can see your workspace.
- Delete a workspace, everything in it is gone from our DB (modulo a
  24-hour Supabase PITR window; ask us if you want a signed deletion
  confirmation and we'll run a targeted purge).

If you self-host: all of the above applies to your own infra. DEPLOY.md
covers setup. You own the encryption key. You own the DB.

## Questions worth asking

If a security-minded teammate is reviewing Prismian, these are the
answers they're probably after:

- **"Can Prismian write to our prod DB?"** No. The connection is opened
  via `pg.Pool`, but the only SQL the connector ever issues is `SELECT`.
  There is no `INSERT` / `UPDATE` / `DELETE` / DDL anywhere in
  `apps/api/src/services/connectors/postgres.ts`.
- **"Can an agent escalate to read a denied column?"** Denied columns
  are stripped in `filterDeniedFields` before serialization. Every
  read path — single entry, collection list, version history, search,
  structured query, aggregate — goes through the same function.
- **"Can I prove which agent read which row?"** Yes. Every agent read
  writes an `audit_log` row with the agent key id and the entry id.
- **"What happens if Prismian goes down?"** Your source DB is
  unaffected. Agents return errors on their MCP calls. Nothing in your
  infra depends on Prismian being up.
- **"Can I rotate the encryption key?"** On self-host, yes — but you
  have to re-encrypt `data_sources.encrypted_config` manually (no
  built-in rotation UI yet). On Prismian Cloud we do this for you.

Anything else, open an issue or email us — we'd rather answer once in
writing than wave at the question.

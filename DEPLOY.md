# Deploying TeamMem

## 1. Supabase (Database + Auth + Realtime)

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note these values from **Settings → API**:
   - `Project URL` (e.g. `https://abc123.supabase.co`)
   - `anon public` key
   - `service_role` key (keep secret!)
3. Note the **database connection string** from **Settings → Database → Connection string → URI**.
4. In the Supabase **SQL Editor**, run the migration files in order:
   - `apps/api/src/db/migrations/001_initial.sql`
   - `apps/api/src/db/migrations/002_embedding_jobs.sql`
   - `apps/api/src/db/migrations/003_rls_policies.sql`
   - `apps/api/src/db/migrations/004_workspace_invites.sql`
   - `apps/api/src/db/migrations/005_connected_sources.sql`
   - `apps/api/src/db/migrations/006_agent_key_lastfour.sql`
5. Enable **Realtime** for the `entries` table:
   - Go to **Database → Replication**
   - Ensure the `entries` table is enabled for realtime
6. **Configure Auth** (Authentication → Providers):
   - Email/password is on by default. Recommended: leave **Confirm email** enabled so new signups must verify their address before accessing a workspace.
   - To enable social login, flip on **Google** and/or **GitHub** and paste the OAuth client IDs. TeamMem's register and login pages automatically show the buttons when providers are configured.
   - **Site URL** (Authentication → URL Configuration) must be set to your production web app URL (e.g. `https://app.teammem.dev`). Add `https://app.teammem.dev/reset-password` to the **Redirect URLs** list so password-reset emails land on the right page.

## 2. Generate the connector encryption key

TeamMem encrypts all connected-database credentials (connection strings) at rest using `CONNECTOR_ENCRYPTION_KEY`. Generate one:

```bash
openssl rand -base64 32
```

Store the output securely — if you lose it, all encrypted connection strings become unreadable and you'll need to reconnect each data source.

## 3. Generate a cron secret

On serverless hosts (Vercel), the in-process 15-minute sync scheduler does NOT run — the process dies between requests. You need an external scheduler to trigger syncs. Generate a secret for that scheduler to authenticate with:

```bash
openssl rand -hex 32
```

Skip this step if you're deploying to Railway / Fly / Render / a VPS — the in-process scheduler works fine on long-running hosts.

## 4. API Server

### Option A: Vercel (serverless, free)

1. Push your repo to GitHub.
2. Import the `apps/api` folder as a new Vercel project.
3. Set the **Root Directory** to `apps/api`.
4. Add environment variables:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `DATABASE_URL` = your Supabase connection string (use the **pooler** URL with port 6543)
   - `OPENAI_API_KEY` = your OpenAI key (optional, enables semantic search)
   - `CONNECTOR_ENCRYPTION_KEY` = output of `openssl rand -base64 32`
   - `CRON_SECRET` = output of `openssl rand -hex 32`
   - `ALLOWED_ORIGINS` = comma-separated list of web-app origins (e.g. `https://app.teammem.dev`). **Required in production** — browser requests from any other origin will be rejected.
   - `WEB_URL` = your public web app URL (e.g. `https://app.teammem.dev`). **Required in production** — used as the redirect target in invite emails. If missing, invite links point at localhost.
5. Deploy.
6. **Add a Vercel Cron job** to drive syncs. In the root of `apps/api`, create `vercel.json`:

   ```json
   {
     "crons": [
       {
         "path": "/api/v1/admin/sync-due",
         "schedule": "*/15 * * * *"
       }
     ]
   }
   ```

   Vercel automatically passes an `Authorization: Bearer <CRON_SECRET>` header to cron-triggered routes, which the `sync-due` endpoint accepts.

### Option B: Railway / Fly / Render / VPS ($5-10/month, background workers work)

1. Connect your GitHub repo.
2. Set root directory to `apps/api`.
3. Add the same environment variables as Option A (including `ALLOWED_ORIGINS`), EXCEPT you can skip `CRON_SECRET` — the in-process scheduler runs automatically on long-lived hosts.
4. The platform auto-detects Node.js and runs `npm start`.

## 5. Web App (Vercel, free)

1. Import the `apps/web` folder as a new Vercel project.
2. Set the **Root Directory** to `apps/web`.
3. Set **Framework Preset** to `Vite`.
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
   - `VITE_API_URL` = your deployed API URL (e.g. `https://teammem-api.vercel.app`)
5. Deploy.

## 6. MCP Server

The MCP server runs locally on each teammate's machine. Users generate an agent key from **Workspace → Settings → Agent Keys** in the web UI, then paste the generated config into their tool:

```jsonc
// Claude Desktop / Cursor config
{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {
        "TEAMMEM_API_KEY": "tm_sk_...",
        "TEAMMEM_WORKSPACE": "workspace-uuid",
        "TEAMMEM_API_URL": "https://teammem-api.vercel.app"
      }
    }
  }
}
```

The Settings page pre-fills the full JSON config for each tool (Claude Desktop, Cursor, generic env vars) when a new key is created.

## Security model (quick reference)

| Layer | What protects it |
| --- | --- |
| User auth | Supabase Auth (bcrypt passwords, JWT sessions, OAuth via Google/GitHub, email verification, rate-limited login endpoints). |
| API auth | Bearer tokens required on every route. Supabase JWTs for humans, `tm_sk_`-prefixed keys for agents. |
| Agent keys | 32 bytes of random, SHA-256 hashed at rest, raw key shown exactly once at creation. Last 4 characters stored for visual identification only. Revocable at any time. |
| Connection strings | AES-256-GCM encrypted using `CONNECTOR_ENCRYPTION_KEY`, never returned to the client in plaintext. |
| Workspace isolation | Middleware on every route resolves the target workspace and verifies caller membership. Belt: Postgres RLS policies on workspaces, collections, entries, data_sources. |
| Connected collections | Structurally read-only — `POST`/`PUT`/`DELETE /entries` reject with `409 read_only_source` when `source_id IS NOT NULL`, regardless of the caller's permissions. |
| Column redaction | `field_restrictions` on agent keys strip denied fields from `structured_data` before the API returns it. Enforced server-side in `filterDeniedFields`. |
| CORS | Env-driven allowlist (`ALLOWED_ORIGINS`). Wildcard origins not permitted. |
| Admin cron endpoint | `CRON_SECRET` required in `x-cron-secret` or `Authorization: Bearer` header. Constant-time compared. |
| Audit trail | Every agent action + every user mutation logged to `audit_log` with actor, resource, timestamp. |

Threat model non-goals for v1: multi-region replication, key rotation UX (the CONNECTOR_ENCRYPTION_KEY is static — rotating requires re-encrypting `data_sources.encrypted_config` manually), MFA (Supabase supports TOTP; we don't wire the UI yet).

## Data architecture (quick reference)

Connected collections are **cached copies**, not live passthroughs:

- On sync, TeamMem reads the selected columns from your source DB (via the encrypted connection string) and inserts them into our own `entries` table as JSONB.
- Agents query OUR database (with permissions, redaction, audit), never yours.
- Sync runs every 15 minutes (configurable via `SYNC_INTERVAL_MS`) or on manual "Sync now."
- Source DB credentials never leave the API layer; they're AES-GCM encrypted using `CONNECTOR_ENCRYPTION_KEY`.

This keeps load off your prod DB, enables column redaction before data leaves TeamMem, and lets us embed content for semantic search. The tradeoff is 15-minute staleness, which is acceptable for the "AI access layer" use case (decisions, customers, orders — not real-time dashboards).

## Local Development

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in Supabase + OpenAI + CONNECTOR_ENCRYPTION_KEY
cp apps/web/.env.example apps/web/.env   # fill in Supabase credentials
pnpm run db:migrate                       # applies all migrations incl. 005_connected_sources.sql
pnpm run dev                              # starts web + API (scheduler runs in-process)
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Vercel      │     │  Vercel /    │     │  Supabase          │
│  (Web UI)    │────▶│  Railway     │────▶│  • Postgres+pgvec  │
│  React+Vite  │     │  (API)       │     │  • Auth            │
└──────┬───────┘     │  Hono+Node   │     │  • Realtime        │
       │             └──────┬───────┘     └────────────────────┘
       │                    │ ▲
       ▼                    │ │                       ┌──────────────────┐
  Supabase Auth             │ └───── cron ──────────▶ Your source DB    │
  (login/register)          ▼       (every 15m)      (read-only mirror) │
                       MCP Server                    └──────────────────┘
                       (local,
                       per user)
```

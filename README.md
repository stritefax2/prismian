<div align="center">

# TeamMem

**AI-safe access to your team's data, over MCP.**

Connect Postgres once. Claude, Cursor, ChatGPT, and every other
MCP-compatible AI tool on your team gets scoped, audited, column-level
redacted read access. No pasting schemas into chat. No shared prod passwords.

[Try it free](https://app.teammem.dev) ·
[Data handling](./DATA_HANDLING.md) ·
[Self-host](./DEPLOY.md) ·
[Contributing](./CONTRIBUTING.md)

</div>

---

## What this is

TeamMem is an open-source **access layer** for your team's data in the age of AI
agents. You connect a data source once (currently Postgres; Google Sheets and
Notion next). TeamMem mirrors the tables and columns you pick into a
permissioned workspace that every AI tool on your team can query over the
[Model Context Protocol](https://modelcontextprotocol.io/).

Two kinds of collection live inside a workspace:

- **Connected collections** — read-only mirrors of rows from your source
  database. Agents never write to these. Writes from the API return
  `409 read_only_source` by construction, not by policy.
- **Native collections** — writable, versioned entries the team and agents
  use to capture decisions, meeting notes, insights, or observations linked
  to synced rows.

Every agent gets a scoped key with its own permissions — which collections
it can read, which columns to redact, how many results per query, and (in
v1.1) a per-hour read rate limit. Every read and write is logged to an
audit trail.

## Why not just...

| Alternative | Why TeamMem exists |
| --- | --- |
| Plain Postgres MCP server | Single-user, no team layer, no column redaction, no audit, same credentials shared across tools. |
| Supabase's / Neon's official MCP | Single vendor only, no workspace/member model, no per-agent ACLs. |
| Notion or Confluence + MCP hack | Stores knowledge for humans. Doesn't query your Postgres. |
| Shared `CLAUDE.md` / rules files | Works for one person, falls apart with a team. No live data. |
| Build it yourself on Postgres + pgvector | You could — and this is what you'd build. We built it so you don't have to. |

## Architecture in one diagram

```
       ┌─────────────────────┐
       │  Your source DB     │  ← Postgres / Supabase / Neon / RDS
       │  (read-only role)   │
       └──────────┬──────────┘
                  │ scheduled mirror (15 min)
                  ▼
       ┌─────────────────────┐        ┌─────────────────────┐
       │  TeamMem API        │◀──────▶│  Postgres + pgvector│
       │  (Hono + Node)      │        │  (mirror + native + │
       └───┬──────────┬──────┘        │  audit log)         │
           │          │               └─────────────────────┘
           │          │
           │          │ ──── MCP (stdio / SSE) ────▶ Claude, Cursor, ChatGPT...
           │
           │
           ▼
       ┌─────────────────────┐
       │  Web UI             │  ← members, scoped keys, data sources
       │  (React + Vite)     │
       └─────────────────────┘
```

Source DB is queried only at sync time. Agents always hit our mirror, which
applies column redaction and audit before any byte leaves the API.

## What's in this repo

| Path | What it is |
| --- | --- |
| `apps/api` | Hono API server — auth, routes, connectors, sync, admin cron. |
| `apps/web` | React + Vite web app — onboarding, workspace UI, settings. |
| `apps/mcp-server` | MCP client published as `teammem-mcp` — what each AI tool runs. |
| `packages/shared` | Zod schemas + shared types between apps. |
| `DEPLOY.md` | Full deployment guide (Supabase, Vercel / Railway, SMTP). |
| `LAUNCH.md` | Pre-launch checklist: smoke test, env vars, curls to verify. |
| `CLAUDE.md` | Architecture + conventions cheat-sheet for contributors. |

## MCP tools this exposes

| Tool | What it does |
| --- | --- |
| `list_collections` | Discover tables + column schemas. Called first in every conversation. |
| `query_structured` | Filter rows by exact field values (eq/neq/gt/gte/lt/lte/contains/in). |
| `aggregate` | COUNT / SUM / AVG / MIN / MAX with optional GROUP BY, HAVING, ORDER BY. |
| `search` | Semantic + full-text over prose columns and native docs. |
| `read_entry` | Full record for a single row or entry. |
| `write_entry` | Create an entry in a native collection (never synced). |
| `update_entry` | Update a native entry with optimistic-lock conflict detection. |
| `workspace_info` | One-shot overview: name, collections, sync state, schemas. |

Plus `delete_entry` and `store_document` for longer content. All 10 are
exposed to any MCP-compatible client.

## Quick start (self-host)

Prereqs: Node 20+, pnpm, Docker (for local Postgres), and a Supabase
project (free tier works) for auth + realtime.

```bash
git clone https://github.com/stritefax2/teammem.git
cd teammem
pnpm install

# Local Postgres via docker-compose
docker compose up -d postgres

# API env
cp apps/api/.env.example apps/api/.env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL,
#          CONNECTOR_ENCRYPTION_KEY (openssl rand -base64 32)

# Web env
cp apps/web/.env.example apps/web/.env
# Fill in: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Migrate + run
pnpm run db:migrate
pnpm run dev
```

Open http://localhost:5173, register with your email, confirm, and
follow the in-app onboarding. Full deploy instructions (Vercel + custom
SMTP + cron) in [DEPLOY.md](./DEPLOY.md).

To verify the whole stack end-to-end, run the smoke test:

```bash
cd apps/api
pnpm run smoke
```

## MCP client — for your AI tool

Any MCP-compatible tool connects with the `teammem-mcp` package. Once you
generate an agent key in Settings → Agent Keys, paste this into your
tool's MCP config:

```jsonc
{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {
        "TEAMMEM_API_KEY": "tm_sk_...",
        "TEAMMEM_WORKSPACE": "your-workspace-uuid",
        "TEAMMEM_API_URL": "https://your-api.example.com"
      }
    }
  }
}
```

Works today with Claude Desktop, Cursor, Cline, Windsurf, and any MCP-spec
client.

## Status

- **Postgres** connector — beta, covers Supabase / Neon / RDS / plain Postgres.
- **Google Sheets**, **Notion** — next.
- **Linear**, **Airtable**, **MySQL**, **BigQuery** — planned.
- **Wrapping third-party MCP servers** with TeamMem's identity and audit
  layer — planned, lets you add a new source whenever a vendor ships their
  own MCP.

## Security model

See [DATA_HANDLING.md](./DATA_HANDLING.md) for the full "what leaves
your DB, what we store, what we log" writeup — this is the page
security-minded reviewers read first. Deployment-level knobs are
covered in [DEPLOY.md](./DEPLOY.md#security-model-quick-reference).
Highlights:

- Scoped agent keys (32-byte random, SHA-256 hashed, `tm_sk_` prefix).
- Field-level redaction applied before data leaves the API.
- Structural write-lock on connected collections — `POST` / `PUT` / `DELETE`
  reject with `409 read_only_source` regardless of caller permissions.
- Connection strings AES-256-GCM encrypted with a server-side key.
- Every action logged to `audit_log`.
- CORS allowlist, workspace-membership middleware on every route, cron
  secret with constant-time comparison.
- Postgres Row Level Security as defense-in-depth.

Not yet in v1: MFA UI, SSO / SAML, SOC 2. Targets for v1.2+.

## Contributing

PRs welcome — especially new connectors. See
[CONTRIBUTING.md](./CONTRIBUTING.md).

Good first issues:

- A Google Sheets connector (Postgres connector is the template).
- Entry history MCP tool (`entry_history(entry_id)`) exposing the existing
  `entry_versions` table.
- Per-key read rate limiting (write-rate limiting already works; clone the
  pattern).
- Resend-invite and copy-invite-link buttons in Settings → Members.

## Hosted

TeamMem runs as a hosted app at
[app.teammem.dev](https://app.teammem.dev) — free while in private beta
with a small group of design partners. Sign up, connect your Postgres,
generate a scoped agent key, and paste the config into Cursor or
Claude. That's the install.

If you'd rather run it yourself, [DEPLOY.md](./DEPLOY.md) walks you
through it — same codebase, same migrations, same MCP server.

## License

Apache 2.0. See [LICENSE](./LICENSE).

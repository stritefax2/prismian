# Prismian

Persistent, permissioned knowledge base for teams and their AI tools.

## Stack

- Monorepo: pnpm workspaces + Turborepo
- Frontend: React 19 + Vite + Tailwind CSS 4 (apps/web)
- API: Hono on Node.js (apps/api)
- MCP Server: TypeScript + @modelcontextprotocol/sdk (apps/mcp-server)
- DB: Supabase (PostgreSQL 16 + pgvector)
- Auth: Supabase Auth (email/password, JWT)
- Real-time: Supabase Realtime (Postgres changes → WebSocket)
- Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
- Shared types: packages/shared (Zod schemas)
- Deploy: Vercel (web + API), Supabase (DB + auth + realtime)

## Dev Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # add Supabase + OpenAI credentials
cp apps/web/.env.example apps/web/.env   # add Supabase credentials
pnpm run dev                              # starts web + api concurrently
```

See DEPLOY.md for production deployment steps.

## Architecture

- **Web app** talks to Supabase directly for auth and realtime
- **Web app** talks to the API for all business logic (CRUD, search, agent keys)
- **API** verifies Supabase JWTs + agent API keys, then hits Postgres directly via `pg`
- **MCP server** is a thin client calling the REST API with an agent key
- **Supabase Realtime** listens to Postgres changes on the entries table — no custom WebSocket server needed

## Key Patterns

- Auth: Supabase handles registration/login/sessions. API verifies tokens via `supabase.auth.getUser(token)`. Users are upserted into our `users` table on first API call.
- Agent keys (`pr_sk_` prefix) bypass Supabase auth — validated directly against `agent_keys` table
- Agent permissions enforced at every route: collection-level, field-level, rate limits, delete protection
- Embeddings generated async via `embedding_jobs` polling queue — never blocks writes
- Entry updates use optimistic locking with automatic three-way field-level merge
- All mutations logged to `audit_log` table
- JSONB field names validated against `/^[a-zA-Z_][a-zA-Z0-9_]*$/` to prevent SQL injection
- RLS policies provide defense-in-depth at the Postgres level

## API Routes

```
GET    /api/v1/auth/me
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:id
GET    /api/v1/workspaces/:id/members
POST   /api/v1/workspaces/:id/invite
GET    /api/v1/collections?workspace_id=
POST   /api/v1/collections
GET    /api/v1/collections/:id
GET    /api/v1/collections/:id/entries
DELETE /api/v1/collections/:id
GET    /api/v1/entries/:id
POST   /api/v1/entries
PUT    /api/v1/entries/:id
DELETE /api/v1/entries/:id
GET    /api/v1/entries/:id/versions
POST   /api/v1/search
POST   /api/v1/search/structured
GET    /api/v1/agent-keys?workspace_id=
POST   /api/v1/agent-keys
DELETE /api/v1/agent-keys/:id
GET    /api/v1/audit/:workspaceId
```

## MCP Tools

7 tools: `search`, `read_entry`, `write_entry`, `update_entry`, `list_collections`, `query_structured`, `workspace_info`

Transports: stdio (local `npx prismian-mcp`) and SSE (remote HTTP)

## Testing

```bash
pnpm run test         # unit tests (17 passing: merge + permissions)
pnpm run test:api     # integration tests (needs Postgres)
```

## File Conventions

- Migrations: `apps/api/src/db/migrations/NNN_description.sql`
- API routes: `apps/api/src/routes/{resource}.ts`
- API services: `apps/api/src/services/{service}.ts`
- Web pages: `apps/web/src/pages/{PageName}.tsx`
- Web components: `apps/web/src/components/{ComponentName}.tsx`
- Shared types: `packages/shared/src/types.ts`
- Shared validation: `packages/shared/src/schemas.ts`

## Environment Variables

### API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OPENAI_API_KEY` (optional)
### Web: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
### MCP: `PRISMIAN_API_KEY`, `PRISMIAN_WORKSPACE`, `PRISMIAN_API_URL`

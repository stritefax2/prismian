# Contributing to Prismian

Thanks for your interest — this project is better with you.

Prismian is early. That means:

- **Bug reports are welcome.** The more specific, the better.
- **Feature requests are welcome** via GitHub Issues. Tag them with what
  part of the product they're about (connector, security, mcp, web UI,
  docs, etc.).
- **PRs are welcome.** The best first PRs are usually new connectors,
  MCP tool improvements, or docs.

## Ground rules

- Be kind. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- Security issues — please don't open a public issue. Email
  `security@prismian.dev` (or if that bounces, reach out via GitHub's
  private vulnerability reporting on this repo).
- Keep PRs focused. One change per PR. Big sweeping refactors are hard
  to review and hard to revert.

## Local setup

```bash
git clone https://github.com/stritefax2/prismian.git
cd prismian
pnpm install
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env   # fill in Supabase + CONNECTOR_ENCRYPTION_KEY
cp apps/web/.env.example apps/web/.env
pnpm run db:migrate
pnpm run dev
```

See the root [README.md](./README.md) for env var details and
[DEPLOY.md](./DEPLOY.md) for the full production deploy path.

## Running tests

```bash
cd apps/api
pnpm test             # 44 unit tests — crypto, merge, permissions, schema validation
pnpm run smoke        # end-to-end smoke test against a local Postgres
```

Please make sure `pnpm test` stays green on your branch before opening a PR.
The smoke test requires a running local Postgres and a
`CONNECTOR_ENCRYPTION_KEY` env var.

## Typechecks and lint

```bash
# From the repo root
pnpm -r build         # builds all packages; any TS error blocks
```

We don't currently run a formal linter. Keep style consistent with
neighbouring code. TypeScript strict mode is on; don't work around it
with `any` unless you have a good reason and flag it in the PR.

## Writing a new connector

The Postgres connector is the template. To add a new source
(e.g. MySQL, Google Sheets, Notion):

1. Add a migration if the source needs a new column on `data_sources`
   (e.g. `oauth_token` for Sheets). Put it in
   `apps/api/src/db/migrations/NNN_description.sql` with the next
   sequential number.
2. Extend `DataSourceType` in
   [packages/shared/src/types.ts](./packages/shared/src/types.ts).
3. Add a connector module under
   `apps/api/src/services/connectors/<source>.ts` with:
   - A `testConnection(config)` function (the Connect button runs this).
   - An `introspect(config)` function returning `DataSourceTable[]`.
   - A `readRows(config, sourceConfig)` function returning
     `{ rows, row_count, truncated }`.
4. Wire the connector into
   [apps/api/src/services/connectors/sync.ts](./apps/api/src/services/connectors/sync.ts)
   by dispatching on `source_type`.
5. Add frontend support:
   - Update
     [apps/web/src/components/ConnectDataSource.tsx](./apps/web/src/components/ConnectDataSource.tsx)
     to accept whatever the source needs (connection string / OAuth / etc.).
   - Update
     [apps/web/src/components/ConnectedCollectionSetup.tsx](./apps/web/src/components/ConnectedCollectionSetup.tsx)
     if the schema picker needs to look different.
6. Add tests:
   - Schema validation tests for any new Zod schemas.
   - A connector unit test with a mock client (see the pattern in
     [`crypto.test.ts`](./apps/api/src/services/connectors/crypto.test.ts)).
7. Mention the connector in the root [README.md](./README.md) status list.

Keep the connector read-only. Writes to synced sources are never
permitted; that rule is structural in the codebase and shouldn't be
weakened per connector.

## PR conventions

- **Commit messages:** short and focused. Why over what when it's not
  obvious.
- **Describe the change in the PR body,** not just the title. Include
  before/after behavior and which files to look at first.
- **Link the issue** if there is one.
- **Keep diffs small.** If a PR is >500 lines outside of generated files,
  consider splitting it.
- **Test your change.** New features need tests. Bug fixes benefit from
  a regression test.

## What we probably won't merge

Being upfront so you don't waste time:

- **Raw SQL execution as an MCP tool.** See the `aggregate` tool — the
  safe, structured variant is our intended surface. Arbitrary SQL is a
  security surface we don't plan to take on.
- **Agent writes to connected (synced) sources.** The read-only rule is
  an invariant of the product. Agents write to native collections only.
- **Non-Postgres-compatible aggregation operators.** We aggregate over
  JSONB; generalising the engine is out of scope for now.
- **Heavy UI reskinning** without a design discussion — keep changes
  incremental and consistent with the existing patterns.

## Questions?

Open an Issue with the `question` label. We'll get to it.

Thanks for helping build this.

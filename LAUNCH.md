# Pre-Launch Checklist

A single pass through this document should leave you confident that a brand-new user can sign up, connect a database, invite a teammate, and watch their AI tool query the synced data — without a support ticket.

## 1. Local smoke test (do this first)

This catches 80% of wire-level bugs without needing a Supabase project.

```bash
# 1. Start local Postgres (with pgvector).
docker compose up -d postgres

# 2. Configure the API.
cd apps/api
cp .env.example .env
# At minimum, set:
#   DATABASE_URL=postgresql://prismian:prismian@localhost:5432/prismian
#   CONNECTOR_ENCRYPTION_KEY=$(openssl rand -base64 32)

# 3. Apply all migrations.
pnpm run db:migrate

# 4. Run the smoke test.
pnpm run smoke
```

Expected output:

```
✓ CONNECTOR_ENCRYPTION_KEY is set
✓ migrations applied (data_sources table exists)
✓ source table smoke_source_customers created with 4 rows
✓ workspace + data source + connected collection created
✓ first sync returned ok (got ok)
✓ synced 4 rows (got 4)
✓ 4 entries landed (got 4)
✓ structured_data preserved column values
✓ content column pulled into entries.content
✓ content column is excluded from structured_data
✓ credit_card_last4 redacted by filter
✓ mrr redacted by filter
✓ allowed fields pass through
✓ unchanged row did not bump version
✓ updated status propagated
✓ updated content propagated
✓ version bumped on change
✓ entry for deleted source row removed (3 remaining)
✓ connected collection has source_id — route handler will reject human/agent writes
✓ cleaned up test workspace + source table

20 passed, 0 failed
```

If any line fails, stop and fix before proceeding.

## 2. Full local UX walkthrough

Run the web app and API against the same local Postgres, then click through the whole flow yourself as a brand-new user.

```bash
# Terminal 1: API
cd apps/api && pnpm run dev

# Terminal 2: web
cd apps/web && pnpm run dev
```

Open http://localhost:5173 and verify, in order:

- [ ] Landing page loads with the hero, "Works with" strip, product mock, problem, agent-chat mock, how-it-works, security, MCP tools grid, native layer, data-view mock, testimonials, FAQ, pricing, stats-band CTA, footer.
- [ ] Click "Connect your database — free" → register page with social + email.
- [ ] Register with a test email + password.
- [ ] Land in onboarding step 1, name a workspace, continue.
- [ ] Step 2: click "Connect Postgres." Modal opens. Paste a local connection string (e.g. `postgresql://prismian:prismian@localhost:5432/prismian`). Click Connect.
- [ ] The collection setup flow opens. You see tables from the local DB. Pick one, pick columns, pick a content column, click Create & sync.
- [ ] You're advanced to step 3 (native collection templates). Skip or pick some.
- [ ] Step 4: "how it works" explainer. Click "Go to my workspace."
- [ ] Workspace view: your connected collection is there with a `synced` badge.
- [ ] Open it. You see the read-only banner, rows from the source DB, no "Add entry" button.
- [ ] Open an entry. Provenance header shows `synced from table · id=...`. No Edit/Delete buttons.
- [ ] Settings → Data Sources: your connection is listed. Add another connected collection from the same source.
- [ ] Settings → Agent Keys → New key. Try both "Full access" and "Scoped." In scoped mode, the column redaction UI appears for connected collections.
- [ ] Create a scoped key. Copy the `pr_sk_` value.
- [ ] Settings → Members → invite a second test email. Confirm the invite appears in "Pending Invites."
- [ ] Log out. Visit /forgot-password. Confirm the "we sent a link" message shows.
- [ ] Log back in. Verify all workspace state persists.

## 3. Supabase configuration (production)

- [ ] Project created.
- [ ] All migrations applied in order through `006_agent_key_lastfour.sql`.
- [ ] **Authentication → URL Configuration:**
  - Site URL set to your production web URL.
  - Redirect URLs includes `<WEB_URL>/reset-password` and `<WEB_URL>/invite/accept*`.
- [ ] **Authentication → Email Templates:** customize at minimum the "Invite user" and "Reset password" templates with your branding. The defaults work, but look generic.
- [ ] **Authentication → Providers:** confirm email is enabled. Enable Google/GitHub if you want social login.
- [ ] **Database → Replication:** `entries` table is enabled for realtime.
- [ ] **API → URL:** noted.
- [ ] **Settings → Database → Connection pooling:** pooler URL captured for `DATABASE_URL` (port 6543, not 5432).

## 4. Required environment variables

### API (required in production)

| Variable | Purpose | What breaks if missing |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | Auth broken |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | Auth + invites broken |
| `DATABASE_URL` | Postgres connection | Everything broken |
| `CONNECTOR_ENCRYPTION_KEY` | Encrypts stored connection strings | Connector feature disabled |
| `ALLOWED_ORIGINS` | CORS allowlist | All browser requests rejected |
| `WEB_URL` | Invite redirect target | Invite emails point at localhost |
| `CRON_SECRET` | Auth for admin cron endpoint | Sync won't run on serverless |

### API (optional)

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables semantic search embeddings. Without it, search is full-text only. |
| `SYNC_INTERVAL_MS` | Default 900000 (15 min). |
| `CONNECTOR_MAX_ROWS` | Default 10000. |
| `SYNC_STUCK_TIMEOUT_MS` | Default 600000 (10 min) — after this, stuck syncs reset. |

### Web

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Same as API's `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | Your deployed API origin |

## 5. Deployment sanity checks

After deploying, hit these from a terminal:

```bash
# Health check should return 200
curl -i https://api.prismian.dev/health

# Admin health check should 401 without the secret
curl -i https://api.prismian.dev/api/v1/admin/health

# Admin health check with secret should return "configured" for both
curl -i https://api.prismian.dev/api/v1/admin/health \
  -H "x-cron-secret: $CRON_SECRET"

# Trigger a sync tick manually (should return {checked, unstuck, results})
curl -i -X POST https://api.prismian.dev/api/v1/admin/sync-due \
  -H "x-cron-secret: $CRON_SECRET"

# Any /api/v1/* route without auth should 401
curl -i https://api.prismian.dev/api/v1/workspaces

# CORS rejection from an unknown origin
curl -i https://api.prismian.dev/api/v1/workspaces \
  -H "Origin: https://random-site.com"
# → Access-Control-Allow-Origin should NOT be set
```

Then sign up through the production web app and repeat the local walkthrough against production. Invite a real second email address to yourself to verify the invite email flow end-to-end.

## 6. Observability before launch

- [ ] Enable Sentry (or Logflare / Axiom) in `apps/api/src/index.ts`. 10 minutes of setup turns silent 500s into actionable alerts.
- [ ] Point Vercel / Railway log drain to a searchable store.
- [ ] Add a UptimeRobot / BetterStack check on `/health` with a 1-min interval.
- [ ] Decide who gets the PagerDuty / email during the first 48 hours of public launch. (Probably: you.)

## 7. Launch-day assets

- [ ] 60-second screencast of the connect-and-query flow, hosted on YouTube or Loom.
- [ ] Show HN post drafted, reviewed by one trusted friend.
- [ ] Twitter thread drafted with the screencast as tweet 2.
- [ ] One week of follow-up blog posts queued.
- [ ] Waitlist has 50+ email addresses to notify.

## 8. Known limitations (document honestly, don't hide)

If someone asks, tell them:

- **No MFA in the UI yet.** Supabase supports TOTP; we'll wire the enrollment UX in v1.1.
- **Sync is scheduled every 15 minutes**, not real-time. Source-of-truth updates take up to 15 min to propagate (or click "Sync now"). Real-time CDC is a v2 concern.
- **Row-level filtering isn't built yet.** If you need to share *some customers* but not *others*, create a Postgres VIEW at the source and connect to that.
- **Postgres only on day one.** Google Sheets is v1.1 (weeks, not months). Notion/Linear/Gmail are on the roadmap.
- **Self-host only for now.** No dedicated / single-tenant managed option yet.

## 9. Rollback plan

If you discover a critical bug in the first 24 hours:

1. Revert the web-app deployment (Vercel: click "Instant Rollback" on the previous deployment).
2. Keep the API running unless the bug is API-side — you don't want to break agents that connected already.
3. Post a pinned GitHub issue acknowledging the problem.
4. Email everyone on your waitlist or active workspaces.

Don't panic-delete the database. Connected collections can always be re-synced from the source.

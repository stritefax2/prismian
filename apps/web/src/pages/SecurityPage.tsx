import { Link } from "react-router-dom";

type Status = "in-place" | "roadmap" | "not-yet";

interface ControlItem {
  text: string;
  status: Status;
}

interface Section {
  id: string;
  label: string;
  blurb: string;
  items: ControlItem[];
}

const SECTIONS: Section[] = [
  {
    id: "encryption",
    label: "Encryption",
    blurb:
      "Connection credentials are app-level encrypted; transport is TLS everywhere; row-data app-level encryption is on the roadmap.",
    items: [
      {
        status: "in-place",
        text: "Source-DB connection strings: AES-256-GCM at rest, key only the API process holds (CONNECTOR_ENCRYPTION_KEY). Never returned in any API response.",
      },
      {
        status: "in-place",
        text: "All transport: TLS 1.2+ on every hop (browser ↔ web app, web app ↔ API, API ↔ Supabase, API ↔ your source DB).",
      },
      {
        status: "in-place",
        text: "Database disk encryption: AES-256 at the storage layer (Supabase / AWS RDS).",
      },
      {
        status: "roadmap",
        text: "App-level row encryption with per-workspace keys. Today synced rows rely on disk encryption + access controls; envelope encryption with workspace-scoped keys is the next encryption-tier upgrade.",
      },
      {
        status: "not-yet",
        text: "Customer-managed keys (BYOK / KMS). Will ship when an enterprise customer asks.",
      },
    ],
  },
  {
    id: "auth",
    label: "Authentication & access control",
    blurb:
      "Workspace isolation enforced in middleware and Postgres RLS. Per-agent scoping is the differentiator: each AI tool gets a key with its own collection, column, and rate-limit policy.",
    items: [
      {
        status: "in-place",
        text: "Human auth: Supabase Auth — bcrypt password storage, JWT sessions, email confirmation. Optional Google + GitHub OAuth.",
      },
      {
        status: "in-place",
        text: "Workspace isolation: every API route runs middleware that resolves the target workspace and verifies caller membership. Belt: Postgres RLS policies on workspaces, collections, entries, data_sources.",
      },
      {
        status: "in-place",
        text: "Agent keys: 32 bytes of random, SHA-256 hashed at rest. Raw key shown exactly once at creation. Last 4 chars stored for visual identification only. Revocable any time.",
      },
      {
        status: "in-place",
        text: "Per-agent permissions: collection-level read/write/delete grants, field-level redaction, query type allowlist, rate limit per hour.",
      },
      {
        status: "in-place",
        text: "Connected collections are structurally read-only — POST / PUT / DELETE /entries against them rejects with 409 read_only_source. Not just policy: structural invariant.",
      },
      {
        status: "not-yet",
        text: "MFA / 2FA at the human-auth layer. Supabase supports TOTP; UI not yet wired. Will ship when first customer asks.",
      },
      {
        status: "not-yet",
        text: "SSO (SAML, OIDC). Will ship when first enterprise customer asks.",
      },
    ],
  },
  {
    id: "data-handling",
    label: "Data handling & retention",
    blurb:
      "We mirror only the columns you explicitly select. Deletion is fast, complete, and verifiable.",
    items: [
      {
        status: "in-place",
        text: "Selective mirror: only columns you pick at connect-time are copied. Adding a column requires explicit action.",
      },
      {
        status: "in-place",
        text: "Sync frequency: 15-minute default (configurable). No real-time streaming — bounded data exposure window.",
      },
      {
        status: "in-place",
        text: "Workspace delete cascades within seconds: collections, entries, agent keys, audit records, data sources, all child rows.",
      },
      {
        status: "in-place",
        text: "Collection delete: removes its synced rows. Source-DB delete: cascades to every reader collection.",
      },
      {
        status: "in-place",
        text: "Source databases are never touched by Prismian beyond read-only SELECTs against the columns you allowed. We do not write back. We do not introspect outside what you connect.",
      },
      {
        status: "not-yet",
        text: "Per-row TTL / automatic data expiration. Customers retain data until they delete the workspace or collection. Time-based purge on roadmap.",
      },
    ],
  },
  {
    id: "audit",
    label: "Audit & observability",
    blurb:
      "Every read by every agent is logged with row IDs and timestamps. Reviewable in the UI or via API.",
    items: [
      {
        status: "in-place",
        text: "Every agent call to list_collections, query_structured, search, aggregate, read_entry — logged with actor key, resource, returned row count, query metadata, timestamp.",
      },
      {
        status: "in-place",
        text: "Human user mutations (create / update / delete entries, data-source create / delete) — logged.",
      },
      {
        status: "in-place",
        text: "Audit log is queryable via UI (Settings → Audit Log) and via authenticated API (GET /api/v1/audit/:workspace_id).",
      },
      {
        status: "in-place",
        text: "Retention: indefinite by default. Workspace delete cascades audit rows.",
      },
      {
        status: "roadmap",
        text: "Webhook / SIEM streaming export. Today the audit log is pull-based; pushing to Splunk / Datadog / a webhook is on the roadmap when an enterprise customer asks.",
      },
    ],
  },
  {
    id: "incident",
    label: "Vulnerability disclosure & incident response",
    blurb:
      "Direct founder contact during the early-stage phase. Public mailbox for security reports. GDPR-compliant breach notification commitment.",
    items: [
      {
        status: "in-place",
        text: "security@prismian.dev — public mailbox monitored daily. We commit to acknowledging within 24 hours.",
      },
      {
        status: "in-place",
        text: "Coordinated disclosure timeline negotiated case-by-case. Default: 90 days from acknowledgement, sooner if patched.",
      },
      {
        status: "in-place",
        text: "Breach notification commitment: 72 hours from discovery, per GDPR Article 33. Direct email to affected workspace owners with scope, timeline, and mitigation steps.",
      },
      {
        status: "roadmap",
        text: "Bug-bounty program. Early-stage we triage manually; formal bounty in 2026.",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & legal",
    blurb:
      "We're early — SOC 2 is in flight, GDPR posture is real, HIPAA isn't ready. Honest about what we have and don't.",
    items: [
      {
        status: "roadmap",
        text: "SOC 2 Type 1: in progress (Vanta / Drata setup). ETA Q3 2026.",
      },
      {
        status: "roadmap",
        text: "SOC 2 Type 2: planned for Q2 2027 (12-month observation period after Type 1).",
      },
      {
        status: "in-place",
        text: "GDPR: data minimization (only selected columns synced), data-subject deletion via workspace / collection delete, 72-hour breach notification, DPA available on request.",
      },
      {
        status: "not-yet",
        text: "HIPAA: not in scope for v1. Don't connect PHI until we've shipped app-level row encryption.",
      },
      {
        status: "not-yet",
        text: "ISO 27001: deferred until first enterprise customer asks.",
      },
      {
        status: "in-place",
        text: "CCPA: covered by our GDPR-equivalent practices (right to delete, right to know what's stored, no sale of data).",
      },
    ],
  },
];

const SUBPROCESSORS = [
  {
    name: "Vercel",
    region: "United States (us-east)",
    purpose: "Hosting (web app + API serverless functions)",
    cert: "SOC 2 Type 2, ISO 27001, GDPR",
  },
  {
    name: "Supabase",
    region: "United States (configurable per project)",
    purpose: "Postgres database, authentication, storage of mirrored data",
    cert: "SOC 2 Type 2, HIPAA-eligible (Pro tier)",
  },
  {
    name: "Resend",
    region: "United States",
    purpose:
      "Transactional email delivery (auth confirmation, invite, password reset)",
    cert: "SOC 2 Type 2",
  },
  {
    name: "OpenAI",
    region: "United States",
    purpose:
      "Embedding generation (only when content_column is configured on a collection — not used for synced structured data)",
    cert: "SOC 2 Type 2",
  },
  {
    name: "npm, Inc.",
    region: "United States",
    purpose:
      "Distribution of the open-source prismian-mcp package. Does not handle customer data.",
    cert: "SOC 2",
  },
];

const ROADMAP = [
  {
    when: "Q3 2026",
    items: [
      "SOC 2 Type 1 certification",
      "App-level row encryption (per-workspace keys)",
      "MFA support for human accounts",
    ],
  },
  {
    when: "Q4 2026",
    items: [
      "EU data region (Supabase EU project)",
      "Webhook / SIEM streaming for audit log",
      "Self-hosted enterprise deployment guide",
    ],
  },
  {
    when: "Q2 2027",
    items: [
      "SOC 2 Type 2 certification",
      "ISO 27001 certification (if enterprise pull is sustained)",
      "Customer-managed keys (BYOK)",
    ],
  },
];

const STATUS_LABEL: Record<Status, string> = {
  "in-place": "in place",
  roadmap: "on roadmap",
  "not-yet": "not yet",
};

export function SecurityPage() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-xl font-bold text-gray-900 tracking-tight"
            >
              Prismian
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
              <Link to="/" className="hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link
                to="/docs"
                className="hover:text-gray-900 transition-colors"
              >
                Docs
              </Link>
              <span className="text-gray-900">Security</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Lede */}
        <div className="mb-10">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
            Trust · Security
          </p>
          <h1 className="text-4xl font-semibold text-gray-900 tracking-tight leading-[1.1]">
            Security at Prismian
          </h1>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">
            Honest accounting of what we've built, what's on the roadmap,
            and what isn't there yet. The goal of this page is to answer
            most of a buyer's security-review checklist without you
            scheduling a call. If your InfoSec team needs more, email{" "}
            <a
              href="mailto:security@prismian.dev"
              className="text-gray-900 underline underline-offset-2 decoration-gray-300"
            >
              security@prismian.dev
            </a>{" "}
            — we'll walk you through controls 1:1.
          </p>
        </div>

        {/* Up-front honesty */}
        <div className="mb-10 bg-gray-50 border border-gray-200 rounded-md p-4 flex items-start gap-3">
          <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-emerald-700"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-medium text-gray-900">
              Where we are right now (early 2026):
            </span>{" "}
            workspace-level isolation is real and tested, encryption of
            credentials is shipped, audit log is comprehensive, GDPR
            posture is real. SOC 2 is in progress. App-level row
            encryption is the next big build. We recommend non-production
            data for early connections — not because we'd misuse it, but
            because nobody trusts a beta with real customers on day one.
          </p>
        </div>

        {/* Architecture */}
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Architecture in one paragraph
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          Prismian mirrors selected columns from your source database into
          its own Postgres on a 15-minute schedule. Agents query the
          mirror — never your source database. Permission checks (collection
          access, column redaction, rate limits) run before any row leaves
          the API. Every read is recorded in an audit log keyed to the
          requesting agent's API key.
        </p>
        <p className="text-xs text-gray-500 mb-12">
          Detailed diagram on the{" "}
          <Link
            to="/#data-flow"
            className="text-gray-900 underline underline-offset-2 decoration-gray-300"
          >
            home page Data Flow section
          </Link>
          .
        </p>

        {/* Quick reference */}
        <div className="mb-12 bg-gray-50 border border-gray-200 rounded-md p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
            Jump to
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <span className="text-gray-400">→</span>
                <span>{s.label}</span>
              </a>
            ))}
            <a
              href="#sub-processors"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <span className="text-gray-400">→</span>
              <span>Sub-processors</span>
            </a>
            <a
              href="#roadmap"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <span className="text-gray-400">→</span>
              <span>Roadmap</span>
            </a>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {s.label}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {s.blurb}
              </p>
              <ul className="space-y-2.5">
                {s.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 bg-white border border-gray-200 rounded-md p-3"
                  >
                    <StatusBadge status={it.status} />
                    <span
                      className={`text-sm leading-relaxed flex-1 ${
                        it.status === "in-place"
                          ? "text-gray-700"
                          : "text-gray-600"
                      }`}
                    >
                      {it.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Sub-processors */}
        <section id="sub-processors" className="scroll-mt-24 mt-16">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Sub-processors
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Third parties that may process customer data on Prismian's
            behalf. Region listed is where data physically resides.
          </p>
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-[10px] uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-[10px] uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-[10px] uppercase tracking-wider hidden sm:table-cell">
                    Region
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SUBPROCESSORS.map((sp) => (
                  <tr key={sp.name}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-gray-900">{sp.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sp.cert}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700 text-xs leading-relaxed">
                      {sp.purpose}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-500 text-xs hidden sm:table-cell">
                      {sp.region}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            Material changes to sub-processors will be communicated to
            workspace owners 30 days before they take effect, with the
            right to terminate without penalty if you object.
          </p>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="scroll-mt-24 mt-16">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Security roadmap
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Targeted dates, not commitments. We'll move things up or down
            based on customer pull. The biggest factor in what ships
            sooner is which design partners ask for what.
          </p>
          <div className="space-y-3">
            {ROADMAP.map((r) => (
              <div
                key={r.when}
                className="bg-white border border-gray-200 rounded-md p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                    {r.when}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {r.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed"
                    >
                      <span className="text-gray-400 mt-1 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <div className="mt-16 bg-gray-950 rounded-xl ring-1 ring-gray-200 shadow-lg shadow-gray-900/[0.04] p-6">
          <h3 className="text-lg font-semibold text-white">
            Need more for your InfoSec review?
          </h3>
          <p className="mt-2 text-sm text-gray-400 max-w-md leading-relaxed">
            We'll send a DPA, our pen-test summary (when it lands), the
            list of in-scope data flows, and walk through any control
            you want to dig into. Direct founder contact during the early
            phase.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="mailto:security@prismian.dev"
              className="inline-flex items-center gap-1.5 bg-white text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              security@prismian.dev
            </a>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-4 py-2 rounded-md border border-gray-800 hover:border-gray-600 transition-colors"
            >
              Start with non-prod data →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "in-place") {
    return (
      <span
        className="mt-0.5 shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded"
        title="Built and shipped today"
      >
        <svg
          className="w-2.5 h-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {STATUS_LABEL[status]}
      </span>
    );
  }
  if (status === "roadmap") {
    return (
      <span
        className="mt-0.5 shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded"
        title="On the security roadmap"
      >
        <span className="w-1 h-1 rounded-full bg-amber-500" />
        {STATUS_LABEL[status]}
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded"
      title="Not yet — will ship when a customer asks"
    >
      <span className="w-1 h-1 rounded-full bg-gray-400" />
      {STATUS_LABEL[status]}
    </span>
  );
}

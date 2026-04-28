import { useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api.js";

interface DataSource {
  id: string;
  workspace_id: string;
  name: string;
  source_type: string;
  status: string;
  last_sync_at: string | null;
  created_at: string;
}

interface PrivilegeError {
  code: "connector_privilege_too_high";
  detail: string;
  privileges: {
    rolsuper: boolean;
    rolcreaterole: boolean;
    rolcreatedb: boolean;
    rolbypassrls: boolean;
  };
}

// Default to `postgres` — that's the database name on Supabase, Neon, and
// the default RDS template. If a user has a custom DB name they'll see the
// fail and know to swap it. Beats leaving an obvious placeholder.
const ROLE_SQL = `-- Run in your DB's SQL editor, then use the password below
-- in the connection string. On Supabase: Dashboard → SQL Editor.
CREATE ROLE teammem_readonly WITH LOGIN PASSWORD 'change-me';
GRANT CONNECT ON DATABASE postgres TO teammem_readonly;
GRANT USAGE ON SCHEMA public TO teammem_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO teammem_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO teammem_readonly;`;

export function ConnectDataSource({
  workspaceId,
  onClose,
  onConnected,
}: {
  workspaceId: string;
  onClose: () => void;
  onConnected: (ds: DataSource) => void;
}) {
  const [name, setName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [privilegeError, setPrivilegeError] = useState<PrivilegeError | null>(
    null
  );
  const [sqlCopied, setSqlCopied] = useState(false);

  async function copyRoleSql() {
    try {
      await navigator.clipboard.writeText(ROLE_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      // clipboard rejected — user can still select and copy manually
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setPrivilegeError(null);
    try {
      const data = await apiFetch<{ data_source: DataSource }>(
        "/api/v1/data-sources",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: workspaceId,
            name,
            source_type: "postgres",
            connection_string: connectionString,
          }),
        }
      );
      onConnected(data.data_source);
    } catch (err: any) {
      // apiFetch puts structured error JSON on err.body when present.
      const body = err.body as Record<string, unknown> | undefined;

      // Privilege errors get the structured panel (lists which privileges
      // tripped the check + shows the role-creation SQL).
      if (
        body?.code === "connector_privilege_too_high" &&
        body.privileges
      ) {
        setPrivilegeError(body as unknown as PrivilegeError);
      } else {
        // Anything else: surface the most specific message we have.
        // The API returns either { error, detail } from a connection test
        // failure (detail = the actual driver error: bad password, host
        // not found, SSL refused, etc.) or { error: <zod flatten> } when
        // validation fails. Both are far more useful than the top-level
        // string alone, but apiFetch's err.message only carries the short
        // string. Pull the rest out here.
        const top =
          typeof body?.error === "string"
            ? body.error
            : err.message || "Failed to connect";
        const detail =
          typeof body?.detail === "string" ? body.detail : null;

        // Zod validation errors arrive as { error: { fieldErrors, formErrors } }
        const zodFlatten = body?.error as
          | { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
          | undefined;
        const zodLines: string[] = [];
        if (zodFlatten && typeof zodFlatten === "object") {
          if (Array.isArray(zodFlatten.formErrors)) {
            zodLines.push(...zodFlatten.formErrors);
          }
          if (zodFlatten.fieldErrors) {
            for (const [field, msgs] of Object.entries(
              zodFlatten.fieldErrors
            )) {
              if (Array.isArray(msgs)) {
                msgs.forEach((m) => zodLines.push(`${field}: ${m}`));
              }
            }
          }
        }

        const hint =
          typeof body?.hint === "string" ? body.hint : null;

        // Prefer hint > detail > top-level error. Hint is the
        // human-actionable mapping we generate server-side from common
        // pg error codes; detail is the raw driver message; top is the
        // generic "Connection test failed" string.
        const message =
          zodLines.length > 0
            ? `Invalid input — ${zodLines.join("; ")}`
            : hint
              ? `${hint}\n\n${detail ?? top}`
              : detail
                ? `${top} — ${detail}`
                : top;
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-2xl shadow-gray-900/10 max-w-lg w-full overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              Connect a Postgres database
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
              read-only
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form
          id="connect-data-source-form"
          onSubmit={handleSubmit}
          className="p-5 overflow-y-auto"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm whitespace-pre-line leading-relaxed">
              {error}
            </div>
          )}

          {privilegeError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
              <p className="font-medium text-amber-900">
                That role has too many privileges.
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                TeamMem refuses to connect as a superuser or a role that can
                create accounts or bypass RLS. Provision a dedicated
                read-only role (SQL below) and use its credentials instead.
              </p>
              <ul className="mt-2 text-xs text-amber-800 space-y-0.5 list-disc list-inside font-mono">
                {privilegeError.privileges.rolsuper && (
                  <li>SUPERUSER</li>
                )}
                {privilegeError.privileges.rolcreaterole && (
                  <li>CREATEROLE</li>
                )}
                {privilegeError.privileges.rolcreatedb && (
                  <li>CREATEDB</li>
                )}
                {privilegeError.privileges.rolbypassrls && (
                  <li>BYPASSRLS</li>
                )}
              </ul>
            </div>
          )}

          {/* Role-creation SQL — first-class, not hidden behind a toggle */}
          <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-3 py-2.5 border-b border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Create a read-only role first
                </p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  Replace{" "}
                  <code className="bg-white border border-gray-200 px-1 rounded font-mono text-[11px]">
                    'change-me'
                  </code>{" "}
                  with a real password before running. The DB name{" "}
                  <code className="bg-white border border-gray-200 px-1 rounded font-mono text-[11px]">
                    postgres
                  </code>{" "}
                  is correct for Supabase, Neon, and default RDS — only
                  change it if your DB has a different name.
                </p>
              </div>
              <button
                type="button"
                onClick={copyRoleSql}
                className="shrink-0 text-[11px] font-medium bg-white text-gray-900 border border-gray-200 px-2.5 py-1 rounded-md hover:border-gray-300"
              >
                {sqlCopied ? "Copied" : "Copy SQL"}
              </button>
            </div>
            <pre className="bg-gray-950 text-emerald-300 p-3 overflow-x-auto text-[11px] leading-snug font-mono">
{ROLE_SQL}
            </pre>
            <div className="px-3 py-2.5 border-t border-gray-200 bg-white">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                Where to run it
              </p>
              <ul className="text-xs text-gray-700 space-y-1 leading-relaxed">
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900 shrink-0 w-20">
                    Supabase
                  </span>
                  <span className="text-gray-600">
                    Dashboard →{" "}
                    <span className="font-medium">SQL Editor</span> (left
                    sidebar) → paste → Run
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900 shrink-0 w-20">
                    Neon
                  </span>
                  <span className="text-gray-600">
                    Project →{" "}
                    <span className="font-medium">SQL Editor</span> (top
                    nav) → paste → Run
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900 shrink-0 w-20">
                    Self-hosted
                  </span>
                  <span className="text-gray-600">
                    <code className="bg-gray-100 border border-gray-200 px-1 rounded font-mono">
                      psql
                    </code>{" "}
                    as a superuser, or any DB GUI (TablePlus, pgAdmin)
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <label className="block mb-4">
            <span className="text-xs font-medium text-gray-700">
              Connection name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Supabase Prod, Analytics DB"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            />
            <span className="block mt-1 text-xs text-gray-500">
              Just a label — pick something memorable.
            </span>
          </label>

          <label className="block mb-3">
            <span className="text-xs font-medium text-gray-700">
              Connection string
            </span>
            <textarea
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              required
              rows={3}
              placeholder="postgres://teammem_readonly:password@db.example.com:5432/prod?sslmode=require"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-y"
            />
            <span className="block mt-1 text-xs text-gray-500 leading-relaxed">
              AES-GCM encrypted at rest. Never returned to the browser or
              any agent.
            </span>
          </label>

          <details className="mb-4 bg-white rounded-md border border-gray-200 group">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 list-none flex items-center justify-between">
              <span>Where to find this connection string</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="px-3 py-3 border-t border-gray-200 space-y-3 text-xs text-gray-700 bg-gray-50/50">
              <div>
                <p className="font-semibold text-gray-900">Supabase</p>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside text-gray-600">
                  <li>
                    Project dashboard →{" "}
                    <span className="font-medium">Project Settings</span> →{" "}
                    <span className="font-medium">Database</span>
                  </li>
                  <li>
                    Under{" "}
                    <span className="font-medium">Connection string</span>,
                    pick <span className="font-medium">URI</span> and copy
                    the <span className="font-medium">Session pooler</span>{" "}
                    string
                  </li>
                  <li>
                    Swap in the password for the{" "}
                    <code className="bg-white border border-gray-200 px-1 rounded font-mono">
                      teammem_readonly
                    </code>{" "}
                    role you created above
                  </li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-gray-900">Neon</p>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside text-gray-600">
                  <li>
                    Project dashboard →{" "}
                    <span className="font-medium">Connection Details</span>
                  </li>
                  <li>
                    Copy the{" "}
                    <span className="font-medium">Connection string</span>,
                    keep{" "}
                    <code className="bg-white border border-gray-200 px-1 rounded font-mono">
                      ?sslmode=require
                    </code>{" "}
                    on the end
                  </li>
                </ol>
              </div>
            </div>
          </details>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
              On click → Connect
            </p>
            <ol className="text-xs text-gray-700 space-y-0.5 list-decimal list-inside leading-relaxed">
              <li>
                We run{" "}
                <code className="bg-white border border-gray-200 px-1 rounded font-mono">
                  SELECT 1
                </code>{" "}
                to verify the connection.
              </li>
              <li>
                Privileges checked — superuser / CREATEROLE / CREATEDB /
                BYPASSRLS roles are refused.
              </li>
              <li>Connection string AES-GCM encrypted, then stored.</li>
              <li>You pick which tables to expose as collections.</li>
              <li>Agents never see the raw connection string.</li>
            </ol>
          </div>
        </form>

        {/* Footer with actions — sticky at bottom of modal */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="connect-data-source-form"
            disabled={submitting || !name.trim() || !connectionString.trim()}
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Testing connection…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

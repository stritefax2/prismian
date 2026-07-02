import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api.js";

interface McpToolDescriptor {
  name: string;
  description: string | null;
}

interface McpConnectorInfo {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  url: string;
  status: string;
  last_error: string | null;
  tools: McpToolDescriptor[] | null;
  tools_refreshed_at: string | null;
  created_at: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "s$&")
    .slice(0, 40);
}

export function McpServersPanel({ workspaceId }: { workspaceId: string }) {
  const [connectors, setConnectors] = useState<McpConnectorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  function load() {
    apiFetch<{ connectors: McpConnectorInfo[] }>(
      `/api/v1/mcp/connectors?workspace_id=${workspaceId}`
    )
      .then((data) => setConnectors(data.connectors))
      .finally(() => setLoading(false));
  }

  useEffect(load, [workspaceId]);

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    setRowError(null);
    try {
      const data = await apiFetch<{ connector: McpConnectorInfo }>(
        `/api/v1/mcp/connectors/${id}/refresh`,
        { method: "POST" }
      );
      setConnectors((prev) =>
        prev.map((c) => (c.id === id ? data.connector : c))
      );
    } catch (err: any) {
      const detail =
        typeof err.body?.detail === "string" ? err.body.detail : err.message;
      setRowError({ id, message: detail });
      load();
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Remove this MCP server? Agents will lose access to its tools on their next restart."
      )
    )
      return;
    await apiFetch(`/api/v1/mcp/connectors/${id}`, { method: "DELETE" });
    setConnectors((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-gray-600">
          Connect vendor MCP servers (Linear, Sentry, Notion, ...) once —
          Prismian holds the credential, relays tool calls with per-key
          permissions, and logs every call to the audit trail. Your team
          never handles the vendor tokens.
        </p>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0"
        >
          Add MCP server
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          Loading…
        </div>
      ) : connectors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border border-gray-200 mb-3">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            No MCP servers connected
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            Add a vendor's MCP server URL and credential once. Every agent
            key in this workspace can then use its tools — scoped, relayed,
            and audited by Prismian.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Add your first MCP server
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {connectors.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {c.name}{" "}
                    <span className="text-xs font-normal font-mono text-gray-400">
                      {c.slug}_*
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">
                    {c.url}
                  </p>
                  {c.last_error && (
                    <p className="text-xs text-red-600 mt-1 truncate max-w-md">
                      {c.last_error}
                    </p>
                  )}
                  {rowError?.id === c.id && (
                    <p className="text-xs text-red-600 mt-1 max-w-md">
                      {rowError.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      c.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : c.status === "error"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}
                  >
                    {c.status}
                  </span>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === c.id ? null : c.id)
                    }
                    className="text-xs bg-white border border-gray-200 text-gray-800 hover:border-gray-300 px-2.5 py-1 rounded-md font-medium"
                  >
                    {c.tools?.length ?? 0} tool{(c.tools?.length ?? 0) === 1 ? "" : "s"}
                  </button>
                  <button
                    onClick={() => handleRefresh(c.id)}
                    disabled={refreshingId === c.id}
                    className="text-xs bg-white border border-gray-200 text-gray-800 hover:border-gray-300 px-2.5 py-1 rounded-md font-medium disabled:opacity-50"
                  >
                    {refreshingId === c.id ? "Refreshing…" : "Refresh"}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {expandedId === c.id && (c.tools?.length ?? 0) > 0 && (
                <div className="mt-3 border border-gray-200 rounded-md bg-gray-50 divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {(c.tools ?? []).map((t) => (
                    <div key={t.name} className="px-3 py-2">
                      <p className="text-xs font-mono font-medium text-gray-900">
                        {c.slug}_{t.name}
                      </p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <AddMcpServerModal
          workspaceId={workspaceId}
          existingSlugs={connectors.map((c) => c.slug)}
          onClose={() => setShowAddForm(false)}
          onAdded={(connector) => {
            setShowAddForm(false);
            setConnectors((prev) => [connector, ...prev]);
          }}
        />
      )}
    </div>
  );
}

function AddMcpServerModal({
  workspaceId,
  existingSlugs,
  onClose,
  onAdded,
}: {
  workspaceId: string;
  existingSlugs: string[];
  onClose: () => void;
  onAdded: (connector: McpConnectorInfo) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [url, setUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(next: string) {
    setName(next);
    if (!slugTouched) setSlug(slugify(next));
  }

  const slugTaken = existingSlugs.includes(slug);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = await apiFetch<{ connector: McpConnectorInfo }>(
        "/api/v1/mcp/connectors",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: workspaceId,
            name,
            slug,
            url,
            ...(authToken.trim() ? { auth_token: authToken.trim() } : {}),
          }),
        }
      );
      onAdded(data.connector);
    } catch (err: any) {
      const body = err.body as Record<string, unknown> | undefined;
      const top =
        typeof body?.error === "string" ? body.error : err.message || "Failed";
      const detail = typeof body?.detail === "string" ? body.detail : null;
      setError(detail ? `${top} — ${detail}` : top);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-2xl shadow-gray-900/10 max-w-lg w-full overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              Add an MCP server
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
              relayed
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
          id="add-mcp-server-form"
          onSubmit={handleSubmit}
          className="p-5 overflow-y-auto"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm whitespace-pre-line leading-relaxed">
              {error}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-xs font-medium text-gray-700">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="e.g. Linear, Sentry, Notion"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            />
          </label>

          <label className="block mb-4">
            <span className="text-xs font-medium text-gray-700">
              Tool prefix
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              pattern="[a-z][a-z0-9_]*"
              placeholder="linear"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            />
            <span className="block mt-1 text-xs text-gray-500">
              Tools appear to agents as{" "}
              <code className="bg-gray-100 border border-gray-200 px-1 rounded font-mono">
                {slug || "prefix"}_tool_name
              </code>
              . Lowercase letters, digits, underscores.
            </span>
            {slugTaken && (
              <span className="block mt-1 text-xs text-red-600">
                This prefix is already in use in this workspace.
              </span>
            )}
          </label>

          <label className="block mb-4">
            <span className="text-xs font-medium text-gray-700">
              Server URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://mcp.linear.app/mcp"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            />
            <span className="block mt-1 text-xs text-gray-500 leading-relaxed">
              Remote MCP endpoint (Streamable HTTP, with SSE fallback).
              Local/stdio servers aren't supported yet.
            </span>
          </label>

          <label className="block mb-4">
            <span className="text-xs font-medium text-gray-700">
              API token{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </span>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Sent as Authorization: Bearer …"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
            />
            <span className="block mt-1 text-xs text-gray-500 leading-relaxed">
              AES-GCM encrypted at rest. Never returned to the browser or
              any agent — Prismian attaches it server-side on each relayed
              call.
            </span>
          </label>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
              On click → Connect
            </p>
            <ol className="text-xs text-gray-700 space-y-0.5 list-decimal list-inside leading-relaxed">
              <li>We connect to the server and list its tools.</li>
              <li>Credential encrypted, then stored server-side.</li>
              <li>
                Full-access agent keys get the tools on next restart; scoped
                keys need an explicit grant in Agent keys.
              </li>
              <li>Every relayed call lands in the audit log.</li>
            </ol>
          </div>
        </form>

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
            form="add-mcp-server-form"
            disabled={submitting || !name.trim() || !slug.trim() || !url.trim() || slugTaken}
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

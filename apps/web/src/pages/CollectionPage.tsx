import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";
import { useWorkspaceSocket } from "../lib/ws.js";
import { AppShell } from "../components/AppShell.js";
import Markdown from "react-markdown";
import { ImportDialog } from "../components/ImportDialog.js";
import { DocumentUpload } from "../components/DocumentUpload.js";
import type { ChangeEvent } from "@teammem/shared";

interface Collection {
  id: string;
  name: string;
  collection_type: string;
  schema: Record<string, unknown> | null;
  workspace_id: string;
  source_id: string | null;
  source_config: {
    table: string;
    primary_key: string;
    columns: string[];
    content_column?: string;
  } | null;
  sync_status: "idle" | "syncing" | "error" | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

interface Entry {
  id: string;
  structured_data: Record<string, unknown> | null;
  content: string | null;
  created_by: string | null;
  created_by_agent: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  source_row_id: string | null;
}

type SortDir = "asc" | "desc";

export function CollectionPage() {
  const { workspaceId, collectionId } = useParams<{
    workspaceId: string;
    collectionId: string;
  }>();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterText, setFilterText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newFields, setNewFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const PAGE_SIZE = 25;

  const isConnected = Boolean(collection?.source_id);

  const loadEntries = useCallback(() => {
    if (!collectionId) return;
    setLoading(true);
    apiFetch<{ entries: Entry[]; total: number }>(
      `/api/v1/collections/${collectionId}/entries?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
    )
      .then((data) => {
        setEntries(data.entries);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [collectionId, page]);

  useEffect(() => {
    if (!collectionId) return;
    apiFetch<{ collection: Collection }>(
      `/api/v1/collections/${collectionId}`
    ).then((data) => setCollection(data.collection));
    loadEntries();
  }, [collectionId, loadEntries]);

  // Poll for sync progress: when a connected collection is syncing, refresh
  // both the collection metadata (status, last_sync_at) and the entries
  // (which are appearing in real time) every 2s. Stops automatically when
  // sync_status leaves "syncing".
  useEffect(() => {
    if (!collectionId || !collection) return;
    if (collection.sync_status !== "syncing") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const data = await apiFetch<{ collection: Collection }>(
          `/api/v1/collections/${collectionId}`
        );
        if (cancelled) return;
        setCollection(data.collection);
        loadEntries();
        if (data.collection.sync_status !== "syncing") {
          clearInterval(interval);
        }
      } catch {
        // Transient errors during polling shouldn't tear down the UI —
        // next tick will retry.
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [collectionId, collection?.sync_status, loadEntries]);

  const handleWsEvent = useCallback(
    (event: ChangeEvent) => {
      if (event.collection_id === collectionId) loadEntries();
    },
    [collectionId, loadEntries]
  );
  useWorkspaceSocket(workspaceId, handleWsEvent);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { collection_id: collectionId };
    if (newContent.trim()) body.content = newContent;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(newFields)) {
      if (v.trim()) cleaned[k] = v;
    }
    if (Object.keys(cleaned).length > 0) body.structured_data = cleaned;

    await apiFetch("/api/v1/entries", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setNewContent("");
    setNewFields({});
    setShowCreate(false);
    setPage(0);
    loadEntries();
  }

  async function handleSyncNow() {
    if (!collectionId) return;
    setSyncing(true);
    setSyncError("");
    try {
      const result = await apiFetch<{
        sync: {
          status: "ok" | "error" | "already_syncing" | "not_connected";
          error?: string;
          rows_synced?: number;
          truncated?: boolean;
        };
      }>(`/api/v1/data-sources/collections/${collectionId}/sync`, {
        method: "POST",
      });
      const data = await apiFetch<{ collection: Collection }>(
        `/api/v1/collections/${collectionId}`
      );
      setCollection(data.collection);
      loadEntries();

      if (result.sync.status === "error" && result.sync.error) {
        setSyncError(result.sync.error);
      } else if (result.sync.status === "already_syncing") {
        setSyncError(
          "A sync is already in progress — watching for it to finish."
        );
      }
    } catch (err: any) {
      setSyncError(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // Derive columns from schema or data
  const schemaFields = collection?.schema
    ? Object.keys(collection.schema)
    : [];
  const inferredColumns = new Set<string>();
  if (schemaFields.length === 0) {
    for (const entry of entries) {
      if (entry.structured_data) {
        for (const key of Object.keys(entry.structured_data)) {
          inferredColumns.add(key);
        }
      }
    }
  }
  const columns =
    schemaFields.length > 0 ? schemaFields : Array.from(inferredColumns);
  const isStructured = columns.length > 0;
  const hasContent = entries.some((e) => e.content);

  // Sort entries client-side
  const sortedEntries = [...entries].sort((a, b) => {
    if (!sortCol) {
      return sortDir === "desc"
        ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        : new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    }
    const aVal = String(a.structured_data?.[sortCol] ?? "");
    const bVal = String(b.structured_data?.[sortCol] ?? "");
    return sortDir === "asc"
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  // Filter
  const filtered = filterText
    ? sortedEntries.filter((e) => {
        const text = [
          e.content,
          ...Object.values(e.structured_data || {}).map(String),
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(filterText.toLowerCase());
      })
    : sortedEntries;

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <AppShell
      workspaceId={workspaceId}
      breadcrumbs={[
        { label: "Workspace", to: `/w/${workspaceId}` },
        { label: collection.name },
      ]}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isConnected && collection.source_config && (
          <div className="mb-4 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Read-only
                </span>
                Synced from{" "}
                <code className="bg-white/80 text-blue-900 px-1.5 py-0.5 rounded text-xs font-mono">
                  {collection.source_config.table}
                </code>
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {collection.last_sync_at
                  ? `Last synced ${new Date(collection.last_sync_at).toLocaleString()}`
                  : "Awaiting first sync"}
                {collection.source_config.content_column &&
                  ` · content: ${collection.source_config.content_column}`}
              </p>
              {collection.sync_status === "error" &&
                collection.last_sync_error && (
                  <p className="text-xs text-red-600 mt-1 truncate">
                    {collection.last_sync_error}
                  </p>
                )}
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing || collection.sync_status === "syncing"}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors shrink-0"
            >
              {syncing || collection.sync_status === "syncing"
                ? "Syncing..."
                : "Sync now"}
            </button>
          </div>
        )}

        {syncError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {syncError}
            <button
              onClick={() => setSyncError("")}
              className="ml-2 text-red-500 hover:underline text-xs"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Filter entries..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {!isConnected && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowUpload(true)}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Upload docs
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Import CSV
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + Add entry
              </button>
            </div>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-medium text-gray-800 mb-4">New entry</h3>
            {columns.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {columns.map((col) => (
                  <label key={col}>
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {col}
                    </span>
                    <input
                      type="text"
                      value={newFields[col] || ""}
                      onChange={(e) =>
                        setNewFields((f) => ({ ...f, [col]: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </label>
                ))}
              </div>
            )}
            <label>
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Content{" "}
                <span className="normal-case text-gray-400 font-normal">
                  (supports markdown)
                </span>
              </span>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={6}
                placeholder="Write your entry here... Markdown is supported."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y font-mono"
              />
            </label>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create entry
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-gray-400 text-sm">
              Loading entries...
            </div>
          </div>
        ) : filtered.length === 0 && !filterText ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            {isConnected ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {collection.sync_status === "syncing"
                    ? "Syncing from source..."
                    : collection.last_sync_at
                      ? "No rows yet"
                      : "Ready to sync"}
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  {collection.last_sync_at
                    ? "The source table appears to be empty, or nothing matched your selected columns."
                    : "Kick off the first sync to pull rows from your connected database."}
                </p>
                <button
                  onClick={handleSyncNow}
                  disabled={
                    syncing || collection.sync_status === "syncing"
                  }
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {syncing || collection.sync_status === "syncing"
                    ? "Syncing..."
                    : "Sync now"}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start adding data
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  {collection.collection_type === "structured"
                    ? "Add rows of structured data — like a spreadsheet your AI agents can query."
                    : collection.collection_type === "documents"
                      ? "Add documents, meeting notes, or decisions. Agents can search and reference them."
                      : "Add structured fields, freeform content, or both."}
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + Add first entry
                </button>
                <p className="text-xs text-gray-400 mt-4">
                  Tip: Connect an AI agent to write entries automatically via MCP
                </p>
              </>
            )}
          </div>
        ) : isStructured ? (
          /* Table view */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    {columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col}
                          {sortCol === col && (
                            <span className="text-blue-500">
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                    {hasContent && (
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide">
                        Content
                      </th>
                    )}
                    <th
                      onClick={() => {
                        setSortCol(null);
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      }}
                      className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wide w-28 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        Updated
                        {!sortCol && (
                          <span className="text-blue-500">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </span>
                    </th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() =>
                        navigate(
                          `/w/${workspaceId}/c/${collectionId}/entry/${entry.id}`
                        )
                      }
                      className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-3 text-gray-900 max-w-[200px] truncate"
                        >
                          {entry.structured_data?.[col] != null
                            ? String(entry.structured_data[col])
                            : ""}
                        </td>
                      ))}
                      {hasContent && (
                        <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">
                          {entry.content?.slice(0, 100) || ""}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {entry.created_by_agent && (
                            <span
                              className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[9px] font-bold shrink-0"
                              title="Created by AI agent"
                            >
                              A
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(entry.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <svg
                          className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-500">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Card/doc view */
          <div className="grid gap-4">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                onClick={() =>
                  navigate(
                    `/w/${workspaceId}/c/${collectionId}/entry/${entry.id}`
                  )
                }
                className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                {/* Title if present */}
                {typeof entry.structured_data?.title === "string" && (
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {entry.structured_data.title}
                  </h3>
                )}

                {entry.content ? (
                  <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3">
                    <Markdown>{entry.content.slice(0, 400)}</Markdown>
                  </div>
                ) : typeof entry.structured_data?.title !== "string" ? (
                  <p className="text-sm text-gray-400 italic">
                    (no content)
                  </p>
                ) : null}

                {/* Tags — show metadata fields except title/source/internal ones */}
                {entry.structured_data && (() => {
                  const tags = Object.entries(entry.structured_data)
                    .filter(([k]) => !["title", "source", "document_id", "chunk_index", "total_chunks", "section_title"].includes(k));
                  return tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.map(([k, v]) => (
                        <span
                          key={k}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          <span className="text-gray-400">{k}:</span>{" "}
                          {String(v)}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {entry.created_by_agent ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                        <span className="w-3 h-3 rounded-full bg-purple-200 flex items-center justify-center text-[8px] font-bold">
                          A
                        </span>
                        Agent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                        Human
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(entry.updated_at).toLocaleDateString()} · v
                      {entry.version}
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}

            {/* Pagination for doc view */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 && filterText && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              No entries match "{filterText}"
            </p>
          </div>
        )}
      </main>

      {showUpload && (
        <DocumentUpload
          collectionId={collectionId!}
          onDone={() => {
            setPage(0);
            loadEntries();
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {showImport && (
        <ImportDialog
          collectionId={collectionId!}
          onDone={() => {
            setPage(0);
            loadEntries();
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </AppShell>
  );
}

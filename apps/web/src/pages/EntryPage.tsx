import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";
import { AppShell } from "../components/AppShell.js";
import Markdown from "react-markdown";

interface Entry {
  id: string;
  collection_id: string;
  workspace_id: string;
  structured_data: Record<string, unknown> | null;
  content: string | null;
  created_by: string | null;
  created_by_agent: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  source_row_id: string | null;
}

interface CollectionInfo {
  id: string;
  name: string;
  source_id: string | null;
  source_config: {
    table: string;
    primary_key: string;
  } | null;
}

interface Version {
  id: string;
  version: number;
  structured_data: Record<string, unknown> | null;
  content: string | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  changed_by_agent_name: string | null;
  changed_at: string;
  change_type: string;
}

export function EntryPage() {
  const { workspaceId, collectionId, entryId } = useParams<{
    workspaceId: string;
    collectionId: string;
    entryId: string;
  }>();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(
    null
  );
  const [versions, setVersions] = useState<Version[]>([]);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [showVersions, setShowVersions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewAsJson, setViewAsJson] = useState(false);

  useEffect(() => {
    if (!entryId) return;
    apiFetch<{ entry: Entry }>(`/api/v1/entries/${entryId}`).then((data) => {
      setEntry(data.entry);
      setEditContent(data.entry.content || "");
      const fields: Record<string, string> = {};
      if (data.entry.structured_data) {
        for (const [k, v] of Object.entries(data.entry.structured_data)) {
          fields[k] = String(v);
        }
      }
      setEditFields(fields);
    });
    apiFetch<{ versions: Version[] }>(
      `/api/v1/entries/${entryId}/versions`
    ).then((data) => setVersions(data.versions));
    if (collectionId) {
      apiFetch<{ collection: CollectionInfo }>(
        `/api/v1/collections/${collectionId}`
      ).then((data) => setCollectionInfo(data.collection));
    }
  }, [entryId, collectionId]);

  const isSynced = Boolean(entry?.source_row_id || collectionInfo?.source_id);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!entry) return;
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = { version: entry.version };
      if (editContent !== (entry.content || "")) body.content = editContent;
      const changedFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(editFields)) {
        if (String(entry.structured_data?.[k] ?? "") !== v)
          changedFields[k] = v;
      }
      if (Object.keys(changedFields).length > 0)
        body.structured_data = { ...entry.structured_data, ...changedFields };

      const data = await apiFetch<{ entry: Entry; auto_merged?: boolean }>(
        `/api/v1/entries/${entry.id}`,
        { method: "PUT", body: JSON.stringify(body) }
      );
      setEntry(data.entry);
      setEditing(false);
      if (data.auto_merged)
        setError(
          "Your changes were auto-merged with a concurrent edit. Review the result."
        );

      const vData = await apiFetch<{ versions: Version[] }>(
        `/api/v1/entries/${entryId}/versions`
      );
      setVersions(vData.versions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this entry permanently?")) return;
    await apiFetch(`/api/v1/entries/${entryId}`, { method: "DELETE" });
    navigate(`/w/${workspaceId}/c/${collectionId}`);
  }

  function addField() {
    const name = prompt("Field name:");
    if (name && !editFields[name])
      setEditFields((f) => ({ ...f, [name]: "" }));
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const fields = Object.entries(entry.structured_data || {});

  return (
    <AppShell
      workspaceId={workspaceId}
      breadcrumbs={[
        { label: "Workspace", to: `/w/${workspaceId}` },
        { label: "Collection", to: `/w/${workspaceId}/c/${collectionId}` },
        { label: entry.structured_data?.title ? String(entry.structured_data.title) : `Entry` },
      ]}
    >
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 text-amber-600 hover:underline"
            >
              dismiss
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isSynced && collectionInfo?.source_config && (
            <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3 text-xs">
              <span className="text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded-full font-medium">
                Read-only
              </span>
              <span className="text-gray-900">
                Synced from{" "}
                <code className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono">
                  {collectionInfo.source_config.table}
                </code>
                {entry.source_row_id && (
                  <>
                    {" "}
                    ·{" "}
                    <code className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono">
                      {collectionInfo.source_config.primary_key}={entry.source_row_id}
                    </code>
                  </>
                )}
              </span>
            </div>
          )}
          {/* Metadata bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-medium">v{entry.version}</span>
              {isSynced ? (
                <span className="text-gray-500">From connected source</span>
              ) : entry.created_by_agent ? (
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  <span className="w-3 h-3 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold">
                    A
                  </span>
                  Created by agent
                </span>
              ) : (
                <span className="text-gray-400">Created by human</span>
              )}
              <span>
                Updated {new Date(entry.updated_at).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewAsJson((v) => !v)}
                className="text-[10px] font-mono uppercase tracking-wider text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2 py-0.5 rounded"
                title="Toggle raw JSON view"
              >
                {viewAsJson ? "rendered" : "json"}
              </button>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="text-xs text-gray-900 hover:underline"
              >
                History ({versions.length})
              </button>
              {!isSynced && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-gray-900 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-gray-800"
                >
                  Edit
                </button>
              )}
              {!isSynced && (
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {viewAsJson && !editing ? (
            <div className="p-5">
              <div className="bg-gray-950 rounded-md ring-1 ring-gray-900 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    raw entry
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(
                          {
                            id: entry.id,
                            structured_data: entry.structured_data,
                            content: entry.content,
                            source_row_id: entry.source_row_id,
                            version: entry.version,
                            created_at: entry.created_at,
                            updated_at: entry.updated_at,
                          },
                          null,
                          2
                        )
                      );
                    }}
                    className="text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-gray-200"
                  >
                    copy
                  </button>
                </div>
                <pre className="text-[12px] leading-relaxed text-gray-300 font-mono p-4 overflow-x-auto">
                  {JSON.stringify(
                    {
                      id: entry.id,
                      structured_data: entry.structured_data,
                      content: entry.content,
                      source_row_id: entry.source_row_id,
                      version: entry.version,
                      created_at: entry.created_at,
                      updated_at: entry.updated_at,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={handleSave}
            className={viewAsJson && !editing ? "hidden" : ""}
          >
            {/* Structured fields */}
            {(fields.length > 0 || editing) && (
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  {(editing
                    ? Object.entries(editFields)
                    : fields
                  ).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {key}
                      </span>
                      {editing ? (
                        <input
                          type="text"
                          value={editFields[key] ?? ""}
                          onChange={(e) =>
                            setEditFields((f) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">
                          {String(value)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {editing && (
                  <button
                    type="button"
                    onClick={addField}
                    className="mt-3 text-xs text-gray-900 hover:underline"
                  >
                    + Add field
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-5">
              {editing ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className={`text-xs px-2 py-1 rounded ${!showPreview ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className={`text-xs px-2 py-1 rounded ${showPreview ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Preview
                    </button>
                  </div>
                  {showPreview ? (
                    <div className="prose prose-sm max-w-none p-3 rounded-lg border border-gray-200 min-h-[200px]">
                      <Markdown>{editContent || "*Nothing to preview*"}</Markdown>
                    </div>
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={14}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-y font-mono"
                      placeholder="Write here... Markdown is supported."
                    />
                  )}
                </div>
              ) : entry.content ? (
                <div className="prose prose-sm max-w-none text-gray-800">
                  <Markdown>{entry.content}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No content</p>
              )}
            </div>

            {editing && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setShowPreview(false);
                    setEditContent(entry.content || "");
                    const fields: Record<string, string> = {};
                    if (entry.structured_data) {
                      for (const [k, v] of Object.entries(
                        entry.structured_data
                      ))
                        fields[k] = String(v);
                    }
                    setEditFields(fields);
                  }}
                  className="text-gray-500 px-4 py-2 text-sm hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Version history */}
        {showVersions && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Version History
            </h3>
            <div className="space-y-2">
              {versions.map((v) => {
                const actor = v.changed_by_agent_name
                  ? { label: v.changed_by_agent_name, type: "agent" as const }
                  : {
                      label:
                        v.changed_by_name ||
                        v.changed_by_email ||
                        "Unknown",
                      type: "user" as const,
                    };

                return (
                  <div
                    key={v.id}
                    className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          v.change_type === "create"
                            ? "bg-green-100 text-green-700"
                            : v.change_type === "update"
                              ? "bg-gray-100 text-gray-900"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {v.change_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        v{v.version}
                      </span>
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        {actor.type === "agent" && (
                          <span className="w-3 h-3 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[8px] font-bold">
                            A
                          </span>
                        )}
                        {actor.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(v.changed_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

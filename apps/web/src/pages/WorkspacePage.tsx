import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";
import { AppShell } from "../components/AppShell.js";
import { ActivityFeed } from "../components/ActivityFeed.js";
import { useWorkspaceSocket } from "../lib/ws.js";
import type { ChangeEvent } from "@teammem/shared";

interface Workspace {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  name: string;
  collection_type: string;
  entry_count: number;
  source_id: string | null;
  sync_status: "idle" | "syncing" | "error" | null;
  last_sync_at: string | null;
}

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [dismissedNudge, setDismissedNudge] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("documents");
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedError, setSeedError] = useState("");

  async function handleSeedDemo() {
    if (!id) return;
    setSeedingDemo(true);
    setSeedError("");
    try {
      const data = await apiFetch<{
        collection_id: string;
        already_seeded?: boolean;
      }>(`/api/v1/workspaces/${id}/seed-demo`, { method: "POST" });
      navigate(`/w/${id}/c/${data.collection_id}`);
    } catch (err: any) {
      setSeedError(err.message || "Failed to seed demo data");
    } finally {
      setSeedingDemo(false);
    }
  }

  const loadCollections = useCallback(() => {
    if (!id) return;
    apiFetch<{ collections: Collection[] }>(
      `/api/v1/collections?workspace_id=${id}`
    ).then((data) => setCollections(data.collections));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ workspace: Workspace }>(`/api/v1/workspaces/${id}`).then(
      (data) => setWorkspace(data.workspace)
    );
    apiFetch<{ members: unknown[] }>(`/api/v1/workspaces/${id}/members`).then(
      (data) => setMemberCount(data.members.length)
    );
    loadCollections();
  }, [id, loadCollections]);

  const handleWsEvent = useCallback(
    (_event: ChangeEvent) => {
      loadCollections();
    },
    [loadCollections]
  );

  useWorkspaceSocket(id, handleWsEvent);

  async function handleCreateCollection(e: FormEvent) {
    e.preventDefault();
    const data = await apiFetch<{ collection: Collection }>(
      "/api/v1/collections",
      {
        method: "POST",
        body: JSON.stringify({
          workspace_id: id,
          name: newName,
          collection_type: newType,
        }),
      }
    );
    setCollections((prev) => [...prev, { ...data.collection, entry_count: 0 }]);
    setNewName("");
    setShowCreate(false);
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <AppShell
      workspaceId={id}
      workspaceName={workspace.name}
      breadcrumbs={[{ label: workspace.name }]}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Solo user invite nudge */}
        {memberCount === 1 && !dismissedNudge && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                You're the only one here
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Invite teammates so their AI tools share this knowledge too.
                The more agents connected, the smarter everyone's AI gets.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/w/${id}/settings`}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Invite team
              </Link>
              <button
                onClick={() => setDismissedNudge(true)}
                className="text-blue-400 hover:text-blue-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Collections</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            New collection
          </button>
        </div>

        {showCreate && (
          <div className="mb-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            {/* Quick templates */}
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Start from a template
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {[
                { name: "Meeting Notes", type: "documents", icon: "📝" },
                { name: "Decisions", type: "documents", icon: "✅" },
                { name: "CRM Contacts", type: "structured", icon: "👥" },
                { name: "Product Specs", type: "mixed", icon: "📋" },
              ].map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => {
                    setNewName(tpl.name);
                    setNewType(tpl.type);
                  }}
                  className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm"
                >
                  <span className="text-lg">{tpl.icon}</span>
                  <p className="font-medium text-gray-800 mt-1">{tpl.name}</p>
                  <p className="text-xs text-gray-400">{tpl.type}</p>
                </button>
              ))}
            </div>

            <form
              onSubmit={handleCreateCollection}
              className="flex gap-3 items-end"
            >
              <label className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Name
                </span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Collection name"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </label>
              <label>
                <span className="text-sm font-medium text-gray-700">
                  Type
                </span>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="documents">Documents</option>
                  <option value="structured">Structured</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {collections.length === 0 ? (
          <div className="py-12">
            <div className="max-w-xl mx-auto text-center">
              <p className="text-sm text-gray-500 mb-6">
                No collections yet. Start with sample data, or create one
                from scratch.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={handleSeedDemo}
                  disabled={seedingDemo}
                  className="text-left bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-colors p-5 disabled:opacity-60 disabled:cursor-wait"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    Try with sample data
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Seeds a fake{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      demo_customers
                    </code>{" "}
                    collection with 15 rows. Create a scoped agent key,
                    redact <code className="bg-gray-100 px-1 rounded">ssn_fake</code>,
                    paste the MCP config into Cursor or Claude, and ask a
                    question. ~60 seconds end-to-end.
                  </p>
                  <p className="text-xs text-blue-600 mt-3 font-medium">
                    {seedingDemo ? "Seeding…" : "Seed demo collection →"}
                  </p>
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-left bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors p-5"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    Create an empty collection
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Start from a template or a blank native collection.
                    You'll add data via upload, import, or from an agent.
                  </p>
                  <p className="text-xs text-blue-600 mt-3 font-medium">
                    Pick a template →
                  </p>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-6">
                Or connect a Postgres source from{" "}
                <Link
                  to={`/w/${id}/settings?tab=sources`}
                  className="text-blue-600 hover:underline"
                >
                  Settings → Data Sources
                </Link>
                .
              </p>
              {seedError && (
                <p className="text-xs text-red-600 mt-3">{seedError}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <Link
                key={col.id}
                to={`/w/${id}/c/${col.id}`}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {col.name}
                  </h3>
                  {col.source_id && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      synced
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {col.source_id ? "connected" : col.collection_type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {col.entry_count} {col.source_id ? "rows" : "entries"}
                  </span>
                  {col.sync_status === "error" && (
                    <span className="text-xs text-red-500">sync error</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Getting started tips — show when workspace has little data */}
        {collections.length > 0 &&
          collections.reduce((s, c) => s + c.entry_count, 0) < 5 && (
            <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Start building your knowledge base
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                The more you add, the smarter everyone's AI gets. Here are
                the fastest ways to get started:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Tell your AI to save things
                  </p>
                  <p className="text-xs text-blue-700">
                    After any conversation: "Save the key takeaways to
                    TeamMem." Your AI handles the rest.
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Upload existing docs
                  </p>
                  <p className="text-xs text-blue-700">
                    Open a collection → Upload docs. Drop in meeting notes,
                    specs, or reports. They're instantly searchable.
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Let agents write for you
                  </p>
                  <p className="text-xs text-blue-700">
                    "Read this file and store it in our research collection."
                    Your AI reads, chunks, and indexes it.
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Import structured data
                  </p>
                  <p className="text-xs text-blue-700">
                    Open a collection → Import CSV. Paste a spreadsheet and
                    every row becomes a searchable entry.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Activity Feed */}
        {collections.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Recent Activity
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <ActivityFeed workspaceId={id!} />
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

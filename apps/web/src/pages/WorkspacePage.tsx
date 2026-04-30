import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";
import { AppShell } from "../components/AppShell.js";
import { ActivityFeed } from "../components/ActivityFeed.js";
import { useWorkspaceSocket } from "../lib/ws.js";
import type { ChangeEvent } from "@prismian/shared";

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
        {/* Persistent quick-actions bar — visible regardless of how full
            the workspace is. The empty-state CTAs are hidden once
            collections exist; without this strip, users have to guess
            that the only way to add a data source / generate an agent
            key / view the audit log is via the small Settings link in
            the AppShell header. */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            to={`/w/${id}/settings?tab=sources`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <span className="text-emerald-500">+</span>
            Data source
          </Link>
          <Link
            to={`/w/${id}/settings?tab=agents`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <span className="text-emerald-500">+</span>
            Agent key
          </Link>
          <Link
            to={`/w/${id}/settings?tab=audit`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-md transition-colors"
          >
            Audit log
          </Link>
          <Link
            to={`/w/${id}/settings?tab=members`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-md transition-colors"
          >
            Members
          </Link>
          <Link
            to={`/w/${id}/settings?tab=workspace`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-md transition-colors ml-auto"
            title="Workspace info, danger zone (delete)"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Workspace
          </Link>
        </div>

        {/* Solo user invite nudge */}
        {memberCount === 1 && !dismissedNudge && (
          <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                You're the only one here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Invite teammates so their AI tools share this knowledge too.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/w/${id}/settings`}
                className="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                Invite team
              </Link>
              <button
                onClick={() => setDismissedNudge(true)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        )}


        {showCreate && (
          <div className="mb-6 bg-white p-5 rounded-md border border-gray-200">
            {/* Quick templates */}
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Start from a template
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {[
                { name: "Meeting Notes", icon: "📝" },
                { name: "Decisions", icon: "✅" },
                { name: "CRM Contacts", icon: "👥" },
                { name: "Product Specs", icon: "📋" },
              ].map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => setNewName(tpl.name)}
                  className="text-left p-3 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm"
                >
                  <span className="text-lg">{tpl.icon}</span>
                  <p className="font-medium text-gray-800 mt-1">{tpl.name}</p>
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                />
              </label>
              <button
                type="submit"
                className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
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
          <div className="py-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Connect your team's data
                </h2>
                <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
                  Once a source is connected, every AI tool on your team
                  gets scoped, audited reads — column redaction included.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {/* Primary: Connect Postgres */}
                <Link
                  to={`/w/${id}/settings?tab=sources`}
                  className="sm:col-span-2 text-left bg-gray-950 text-white rounded-xl p-6 ring-1 ring-gray-900 hover:ring-emerald-500/40 transition-all group relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-[0.4] pointer-events-none"
                    aria-hidden="true"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                        Recommended
                      </span>
                    </div>
                    <p className="text-base font-semibold">
                      Connect a Postgres database
                    </p>
                    <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                      Read-only sync from Supabase, Neon, or RDS. Pick
                      which tables and columns each agent can see.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 font-mono">
                      <span>read-only</span>
                      <span className="text-gray-700">·</span>
                      <span>per-agent column redaction</span>
                      <span className="text-gray-700">·</span>
                      <span>full audit trail</span>
                    </div>
                    <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-emerald-400 font-medium group-hover:gap-2.5 transition-all">
                      Connect database →
                    </p>
                  </div>
                </Link>

                {/* Secondary: Sample data */}
                <button
                  onClick={handleSeedDemo}
                  disabled={seedingDemo}
                  className="text-left bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-6 transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
                    No DB? Try the demo
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    Sample data
                  </p>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                    Seeds{" "}
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      demo_customers
                    </code>{" "}
                    with 15 rows. ~60 seconds end-to-end.
                  </p>
                  <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-gray-900 font-medium">
                    {seedingDemo ? "Seeding…" : "Seed demo →"}
                  </p>
                </button>
              </div>

              <p className="mt-6 text-center text-xs text-gray-500">
                Or{" "}
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="text-gray-700 hover:text-gray-900 underline underline-offset-2 decoration-gray-300"
                >
                  create an empty collection
                </button>{" "}
                from a template — upload docs, import CSVs, or have an
                agent write to it.
              </p>

              {seedError && (
                <p className="text-xs text-red-600 mt-3 text-center">
                  {seedError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <CollectionSections
            workspaceId={id!}
            collections={collections}
            onNewNative={() => setShowCreate(true)}
          />
        )}

        {/* Next steps panel — show when workspace has little activity */}
        {collections.length > 0 &&
          collections.reduce((s, c) => s + c.entry_count, 0) < 5 && (
            <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Next steps
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Connect a real source, give an AI tool a key, and you're done.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  to={`/w/${id}/settings?tab=sources`}
                  className="bg-gray-50 hover:bg-white hover:border-gray-300 border border-gray-100 rounded-md p-3 transition-all group"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Step 1
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    Connect a Postgres source
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Read-only sync from Supabase, Neon, RDS. Pick which
                    tables and columns each agent can read.
                  </p>
                </Link>
                <Link
                  to={`/w/${id}/settings?tab=agents`}
                  className="bg-gray-50 hover:bg-white hover:border-gray-300 border border-gray-100 rounded-md p-3 transition-all group"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Step 2
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    Generate an agent key
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    One per AI tool. Each gets its own scope — table access,
                    column redaction, rate limits.
                  </p>
                </Link>
                <Link
                  to={`/w/${id}/settings?tab=members`}
                  className="bg-gray-50 hover:bg-white hover:border-gray-300 border border-gray-100 rounded-md p-3 transition-all group"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Step 3
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    Invite teammates
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    They reuse the same connected sources without sharing
                    DB credentials. Each has their own scoped keys.
                  </p>
                </Link>
                <Link
                  to={`/w/${id}/settings?tab=audit`}
                  className="bg-gray-50 hover:bg-white hover:border-gray-300 border border-gray-100 rounded-md p-3 transition-all group"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Anytime
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    View the audit log
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Every read, every write, every agent — with row IDs and
                    timestamps. Compliance-ready from day one.
                  </p>
                </Link>
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

// Split collections into "Synced data" (source-backed, read-only) and
// "Native collections" (writable). Different lifecycles, different
// access patterns — flattening them into one list confuses users about
// what each card actually is.
function CollectionSections({
  workspaceId,
  collections,
  onNewNative,
}: {
  workspaceId: string;
  collections: Collection[];
  onNewNative: () => void;
}) {
  const synced = collections.filter((c) => c.source_id);
  const native = collections.filter((c) => !c.source_id);

  return (
    <div className="space-y-10">
      {/* Synced data — source-backed, read-only */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Synced data
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Read-only mirrors of tables from your source databases.
              What your agents query.
            </p>
          </div>
          <Link
            to={`/w/${workspaceId}/settings?tab=sources`}
            className="text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-md transition-colors shrink-0 inline-flex items-center gap-1.5"
          >
            <span className="text-emerald-500">+</span>
            Connect source
          </Link>
        </div>
        {synced.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-md p-5 text-center">
            <p className="text-sm text-gray-600">
              No source databases connected.
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Connect a Postgres source and pick which tables to expose
              — that's the data your AI tools will read.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {synced.map((col) => (
              <CollectionCard
                key={col.id}
                workspaceId={workspaceId}
                col={col}
              />
            ))}
          </div>
        )}
      </section>

      {/* Native collections — writable, for agent notes / decisions */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Native collections
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Writable. Where agents log decisions, observations, or
              meeting notes alongside the data they read.
            </p>
          </div>
          <button
            onClick={onNewNative}
            className="text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 px-3 py-1.5 rounded-md transition-colors shrink-0"
          >
            + New collection
          </button>
        </div>
        {native.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-md p-5 text-center">
            <p className="text-sm text-gray-600">
              No native collections yet.
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Optional. Pick a template to give agents a place to write
              decisions, meeting notes, or observations.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {native.map((col) => (
              <CollectionCard
                key={col.id}
                workspaceId={workspaceId}
                col={col}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CollectionCard({
  workspaceId,
  col,
}: {
  workspaceId: string;
  col: Collection;
}) {
  const isSynced = Boolean(col.source_id);
  return (
    <Link
      to={`/w/${workspaceId}/c/${col.id}`}
      className="bg-white p-4 rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-gray-900 truncate">{col.name}</h3>
        {isSynced && (
          <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
            synced
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {isSynced && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
            read-only
          </span>
        )}
        <span className="text-xs text-gray-400">
          {col.entry_count} {isSynced ? "rows" : "entries"}
        </span>
        {col.sync_status === "error" && (
          <span className="text-xs text-red-600 font-medium">
            sync error
          </span>
        )}
      </div>
    </Link>
  );
}

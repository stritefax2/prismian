import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { ConnectDataSource } from "../components/ConnectDataSource.js";
import { ConnectedCollectionSetup } from "../components/ConnectedCollectionSetup.js";
import { NewKeyPanel } from "../components/NewKeyPanel.js";

interface Workspace {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  name: string;
  collection_type?: string;
  source_id?: string | null;
}

interface DataSource {
  id: string;
  workspace_id: string;
  name: string;
  source_type: string;
  status: string;
  last_sync_at: string | null;
  created_at: string;
}

const TEMPLATES = [
  {
    name: "Decisions",
    icon: "✅",
    desc: "What your team decided and why. Agents write here.",
  },
  {
    name: "Meeting Notes",
    icon: "📝",
    desc: "Standups, retros, 1:1s. Searchable by every agent.",
  },
  {
    name: "Agent Observations",
    icon: "🧠",
    desc: "Where Claude/Cursor log insights about connected data.",
  },
  {
    name: "Specs & RFCs",
    icon: "📋",
    desc: "Product specs, engineering RFCs, design docs.",
  },
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(
    new Set()
  );
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingSource, setPendingSource] = useState<DataSource | null>(null);
  const [connectedCollections, setConnectedCollections] = useState<
    Collection[]
  >([]);
  const [firstKeyName, setFirstKeyName] = useState("Claude Desktop");
  const [firstKeyRaw, setFirstKeyRaw] = useState<string | null>(null);
  const [keyCreating, setKeyCreating] = useState(false);
  const [keyError, setKeyError] = useState("");

  async function handleCreateFirstKey() {
    if (!workspace || !firstKeyName.trim()) return;
    setKeyCreating(true);
    setKeyError("");
    try {
      const data = await apiFetch<{ raw_key: string }>("/api/v1/agent-keys", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspace.id,
          name: firstKeyName.trim(),
          permissions: { collections: "*" },
        }),
      });
      setFirstKeyRaw(data.raw_key);
    } catch (err: any) {
      setKeyError(err.message || "Couldn't create key — try again.");
    } finally {
      setKeyCreating(false);
    }
  }

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch<{ workspace: Workspace }>(
        "/api/v1/workspaces",
        {
          method: "POST",
          body: JSON.stringify({ name: workspaceName }),
        }
      );
      setWorkspace(data.workspace);
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  function toggleTemplate(idx: number) {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleCreateCollections() {
    if (!workspace) return;
    setLoading(true);
    try {
      const created: Collection[] = [];
      for (const idx of selectedTemplates) {
        const tpl = TEMPLATES[idx];
        const data = await apiFetch<{ collection: Collection }>(
          "/api/v1/collections",
          {
            method: "POST",
            body: JSON.stringify({
              workspace_id: workspace.id,
              name: tpl.name,
            }),
          }
        );
        created.push(data.collection);
      }
      setCollections(created);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  function handleConnectLater() {
    setStep(3);
  }

  function handleFinish() {
    if (workspace) {
      navigate(`/w/${workspace.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { n: 1, label: "Workspace" },
            { n: 2, label: "Data" },
            { n: 3, label: "Collections" },
            { n: 4, label: "Connect" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium font-mono transition-colors ${
                  s.n < step
                    ? "bg-emerald-500 text-white"
                    : s.n === step
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
                title={s.label}
              >
                {s.n < step ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              {i < 3 && (
                <div
                  className={`w-8 h-px ${s.n < step ? "bg-emerald-500" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Step 1: Name your workspace */}
          {step === 1 && (
            <form onSubmit={handleCreateWorkspace} className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Name your workspace
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                This is where your team's data connections and shared knowledge
                will live. Usually your company or team name.
              </p>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Corp, Product Team, My Startup"
                required
                autoFocus
                className="block w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !workspaceName.trim()}
                className="mt-6 w-full bg-gray-900 text-white py-3 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating..." : "Create workspace"}
              </button>
            </form>
          )}

          {/* Step 2: Connect a data source */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connect your data
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Point Prismian at a Postgres database (Supabase, Neon, RDS, or
                plain Postgres). We'll introspect the schema so you can pick
                which tables and columns your agents can read. Read-only,
                encrypted, always.
              </p>

              <div className="space-y-2 mb-6">
                {[
                  {
                    name: "Postgres",
                    sub: "Supabase, Neon, RDS, self-hosted",
                    ready: true,
                  },
                  {
                    name: "Google Sheets",
                    sub: "Coming soon",
                    ready: false,
                  },
                  {
                    name: "Notion",
                    sub: "Coming soon",
                    ready: false,
                  },
                  {
                    name: "Linear",
                    sub: "Coming soon",
                    ready: false,
                  },
                ].map((src) => (
                  <div
                    key={src.name}
                    className={`flex items-center justify-between p-3.5 rounded-md border ${
                      src.ready
                        ? "border-gray-300 bg-white"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div>
                      <p
                        className={`font-medium text-sm ${
                          src.ready ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {src.name}
                      </p>
                      <p className="text-xs text-gray-500">{src.sub}</p>
                    </div>
                    {src.ready ? (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        beta
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                        soon
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {connectedCollections.length > 0 && (
                <div className="mb-4 bg-emerald-50/60 border border-emerald-200 rounded-md p-3">
                  <p className="text-sm font-medium text-emerald-900 mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {connectedCollections.length} connected collection
                    {connectedCollections.length !== 1 ? "s" : ""} ready
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {connectedCollections.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-mono"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowConnectModal(true)}
                className="w-full bg-gray-900 text-white py-3 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                {connectedCollections.length > 0
                  ? "Connect another database"
                  : "Connect Postgres"}
              </button>
              {connectedCollections.length > 0 ? (
                <button
                  onClick={handleConnectLater}
                  className="mt-2 w-full bg-white text-gray-700 border border-gray-200 py-2.5 rounded-md text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleConnectLater}
                  className="mt-2 w-full text-gray-500 py-2 text-sm hover:text-gray-700"
                >
                  I'll connect later — skip ahead
                </button>
              )}

              {showConnectModal && workspace && (
                <ConnectDataSource
                  workspaceId={workspace.id}
                  onClose={() => setShowConnectModal(false)}
                  onConnected={(ds) => {
                    setShowConnectModal(false);
                    setPendingSource(ds as DataSource);
                  }}
                />
              )}
              {pendingSource && workspace && (
                <ConnectedCollectionSetup
                  workspaceId={workspace.id}
                  dataSourceId={pendingSource.id}
                  dataSourceName={pendingSource.name}
                  onClose={() => setPendingSource(null)}
                  onCreated={(collection) => {
                    setPendingSource(null);
                    setConnectedCollections((prev) => [...prev, collection]);
                  }}
                />
              )}
            </div>
          )}

          {/* Step 3: Pick native collections (optional) */}
          {step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Native collections
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                  optional
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Optional, writable collections — useful if you want agents to
                log decisions or observations alongside the data they read.
                You can always add these later.
              </p>
              <div className="space-y-2">
                {TEMPLATES.map((tpl, idx) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => toggleTemplate(idx)}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-md border text-left transition-all ${
                      selectedTemplates.has(idx)
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl opacity-80">{tpl.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {tpl.name}
                      </p>
                      <p className="text-xs text-gray-500">{tpl.desc}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                        selectedTemplates.has(idx)
                          ? "border-gray-900 bg-gray-900"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedTemplates.has(idx) && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={
                  selectedTemplates.size === 0
                    ? () => setStep(4)
                    : handleCreateCollections
                }
                disabled={loading}
                className="mt-6 w-full bg-gray-900 text-white py-3 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading
                  ? "Setting up..."
                  : selectedTemplates.size === 0
                    ? "Skip — continue without native collections"
                    : `Create ${selectedTemplates.size} collection${selectedTemplates.size !== 1 ? "s" : ""} & continue`}
              </button>
            </div>
          )}

          {/* Step 4: How it works */}
          {step === 4 && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                You're ready to connect agents
              </h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Each AI tool — Claude Desktop, Cursor, ChatGPT — connects via
                its own scoped key. Generate the key in Settings, paste the
                MCP config into the tool, done.
              </p>

              {/* The core loop */}
              <ol className="space-y-3 mb-6">
                {[
                  {
                    step: "1",
                    title: "Generate a scoped agent key",
                    body: "Settings → Agent Keys. Each AI tool gets its own key with its own table-level and column-level permissions.",
                  },
                  {
                    step: "2",
                    title: "Paste the MCP config into your tool",
                    body: "Works with any MCP-compatible tool. The config is pre-filled with your key and workspace ID.",
                  },
                  {
                    step: "3",
                    title: "Agents read connected data, write to native collections",
                    body: "Every read is audited. Source DB stays untouched. All writes go to native collections only.",
                  },
                ].map((item) => (
                  <li
                    key={item.step}
                    className="flex items-start gap-3 bg-white border border-gray-200 rounded-md p-4"
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Inline first-key creator */}
              {firstKeyRaw && workspace ? (
                <div className="mb-4">
                  <NewKeyPanel
                    rawKey={firstKeyRaw}
                    workspaceId={workspace.id}
                  />
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                      now
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      Generate your first agent key
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    Full-access key for your first AI tool. You can scope
                    later keys to specific tables and redact specific
                    columns.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={firstKeyName}
                      onChange={(e) => setFirstKeyName(e.target.value)}
                      placeholder="e.g. Claude Desktop"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateFirstKey}
                      disabled={keyCreating || !firstKeyName.trim()}
                      className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {keyCreating ? "Generating..." : "Generate"}
                    </button>
                  </div>
                  {keyError && (
                    <p className="mt-2 text-xs text-red-600">{keyError}</p>
                  )}
                </div>
              )}

              {collections.length > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-3 mb-4">
                  <p className="text-sm font-medium text-emerald-900 mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Native collections ready
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {collections.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-mono"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleFinish}
                className="w-full bg-gray-900 text-white py-3 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                {firstKeyRaw
                  ? "Done — go to my workspace"
                  : "Skip key for now — go to my workspace"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

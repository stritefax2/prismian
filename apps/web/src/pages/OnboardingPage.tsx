import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { ConnectDataSource } from "../components/ConnectDataSource.js";
import { ConnectedCollectionSetup } from "../components/ConnectedCollectionSetup.js";

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
    type: "documents",
    icon: "✅",
    desc: "What your team decided and why. Agents write here.",
  },
  {
    name: "Meeting Notes",
    type: "documents",
    icon: "📝",
    desc: "Standups, retros, 1:1s. Searchable by every agent.",
  },
  {
    name: "Agent Observations",
    type: "documents",
    icon: "🧠",
    desc: "Where Claude/Cursor log insights about connected data.",
  },
  {
    name: "Specs & RFCs",
    type: "mixed",
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
    new Set([0, 2])
  );
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingSource, setPendingSource] = useState<DataSource | null>(null);
  const [connectedCollections, setConnectedCollections] = useState<
    Collection[]
  >([]);

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
              collection_type: tpl.type,
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
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step
                    ? "bg-green-500 text-white"
                    : s === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {s < step ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 4 && (
                <div
                  className={`w-8 h-0.5 ${s < step ? "bg-green-500" : "bg-gray-200"}`}
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
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !workspaceName.trim()}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                Point TeamMem at a Postgres database (Supabase, Neon, RDS, or
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
                    className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                      src.ready
                        ? "border-blue-500 bg-blue-50/50"
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
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Available
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Soon</span>
                    )}
                  </div>
                ))}
              </div>

              {connectedCollections.length > 0 && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    {connectedCollections.length} connected collection
                    {connectedCollections.length !== 1 ? "s" : ""} ready
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {connectedCollections.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowConnectModal(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                {connectedCollections.length > 0
                  ? "Connect another database"
                  : "Connect Postgres"}
              </button>
              {connectedCollections.length > 0 ? (
                <button
                  onClick={handleConnectLater}
                  className="mt-2 w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleConnectLater}
                  className="mt-2 w-full text-gray-500 py-2 text-sm hover:text-gray-700"
                >
                  I'll connect later — skip to native collections
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

          {/* Step 3: Pick native collections */}
          {step === 3 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Where should agents write?
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Native collections are writable — this is where your agents
                capture decisions, meeting notes, and observations about your
                connected data. Pick a few to start.
              </p>
              <div className="space-y-2">
                {TEMPLATES.map((tpl, idx) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => toggleTemplate(idx)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      selectedTemplates.has(idx)
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{tpl.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {tpl.name}
                      </p>
                      <p className="text-xs text-gray-500">{tpl.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedTemplates.has(idx)
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedTemplates.has(idx) && (
                        <svg
                          className="w-3 h-3 text-white"
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
                onClick={handleCreateCollections}
                disabled={loading || selectedTemplates.size === 0}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading
                  ? "Setting up..."
                  : `Create ${selectedTemplates.size} collection${selectedTemplates.size !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => setStep(4)}
                className="mt-2 w-full text-gray-500 py-2 text-sm hover:text-gray-700"
              >
                Skip — I'll set up collections later
              </button>
            </div>
          )}

          {/* Step 4: How it works */}
          {step === 4 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're ready to connect agents
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Here's how agents get access to your workspace.
              </p>

              {/* The core loop */}
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
                  <span className="text-lg shrink-0">🔑</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Generate a scoped agent key
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Settings → Agent Keys. Each AI tool gets its own key,
                      with its own table-level and column-level permissions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-green-50 rounded-xl p-4">
                  <span className="text-lg shrink-0">🔌</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Paste the MCP config into Claude, Cursor, or ChatGPT
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Works with any MCP-compatible tool. The config is
                      pre-filled with your key and workspace ID.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-purple-50 rounded-xl p-4">
                  <span className="text-lg shrink-0">📡</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Agents read connected data, write to native collections
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Every read is audited. Source DB stays untouched.
                      Decisions and observations accumulate in native
                      collections your whole team's AI can reference.
                    </p>
                  </div>
                </div>
              </div>

              {/* MCP config */}
              <div className="bg-gray-950 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-400 mb-2">
                  Preview of the MCP config you'll paste (key is generated in{" "}
                  <span className="text-gray-300 font-medium">
                    Settings → Agent Keys
                  </span>
                  ):
                </p>
                <pre className="text-xs text-gray-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {`}
                  <span className="text-green-400">{`
        "TEAMMEM_API_KEY": "generate in Settings"`}</span>
                  {`,`}
                  <span className="text-blue-400">{`
        "TEAMMEM_WORKSPACE": "${workspace?.id || "your-workspace-id"}"`}</span>
{`
      }
    }
  }
}`}
                </pre>
              </div>

              {collections.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    Native collections ready
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {collections.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleFinish}
                className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to my workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";

interface Workspace {
  id: string;
  name: string;
}

interface CollectionSummary {
  id: string;
  name: string;
  collection_type: string;
  entry_count: number;
  source_id?: string | null;
  source_config?: {
    table: string;
    primary_key: string;
    columns: string[];
    content_column?: string;
  } | null;
  last_sync_at?: string | null;
  sync_status?: string | null;
}

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const delta = Date.now() - then;
  if (delta < 0) return "just now";
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
}

interface AgentKeyResponse {
  agent_key: {
    id: string;
    name: string;
    last_four: string | null;
  };
  raw_key: string;
}

// Invited users land here via a Supabase magic-link email, already
// authenticated but with no password set. Without this panel, their
// session would expire and they'd be locked out until running the
// forgot-password flow.
function needsPasswordSetup(user: {
  app_metadata?: { provider?: string };
  user_metadata?: { password_set?: boolean };
} | null): boolean {
  if (!user) return false;
  const provider = user.app_metadata?.provider;
  if (provider && provider !== "email") return false;
  if (user.user_metadata?.password_set === true) return false;
  return true;
}

type ToolId = "claude" | "cursor" | "other";

const API_URL = import.meta.env.VITE_API_URL || "";

function apiUrlForMcp(): string {
  if (API_URL) return API_URL;
  if (typeof window === "undefined") return "http://localhost:3001";
  if (window.location.origin.includes("localhost")) {
    return "http://localhost:3001";
  }
  return window.location.origin.replace("://", "://api.");
}

function buildMcpConfig(
  apiKey: string,
  workspaceId: string,
  apiUrl: string
): string {
  const envBlock: string[] = [
    `        "TEAMMEM_API_KEY": "${apiKey}"`,
    `        "TEAMMEM_WORKSPACE": "${workspaceId}"`,
  ];
  if (apiUrl && !apiUrl.includes("localhost")) {
    envBlock.push(`        "TEAMMEM_API_URL": "${apiUrl}"`);
  }
  return `{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {
${envBlock.join(",\n")}
      }
    }
  }
}`;
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const { session, updatePassword } = useAuth();
  const [status, setStatus] = useState<"loading" | "welcome" | "error">(
    "loading"
  );
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const user = session?.user ?? null;
  const showPasswordSetup = needsPasswordSetup(user);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Inline agent-key generation state.
  const [tool, setTool] = useState<ToolId>("claude");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [rawKey, setRawKey] = useState<string>("");
  const [copyState, setCopyState] = useState<Record<string, boolean>>({});

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (passwordValue.length < 8) {
      setPasswordError("At least 8 characters.");
      return;
    }
    if (passwordValue !== passwordConfirm) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await updatePassword(passwordValue);
      setPasswordSaved(true);
      setPasswordValue("");
      setPasswordConfirm("");
    } catch (err: any) {
      setPasswordError(err.message || "Couldn't set password.");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleGenerateKey() {
    if (!workspaceId || !user) return;
    setGenerating(true);
    setGenError("");
    try {
      const defaultName =
        tool === "claude"
          ? `${user.email}'s Claude Desktop`
          : tool === "cursor"
            ? `${user.email}'s Cursor`
            : `${user.email}'s AI tool`;

      const data = await apiFetch<AgentKeyResponse>(
        "/api/v1/agent-keys",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: defaultName,
            // Full access to everything in the workspace. Users can
            // tighten the scope later from Settings → Agent Keys if they
            // want per-column redaction.
            permissions: { collections: "*" },
          }),
        }
      );
      setRawKey(data.raw_key);
    } catch (err: any) {
      setGenError(err.message || "Couldn't generate key.");
    } finally {
      setGenerating(false);
    }
  }

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopyState((prev) => ({ ...prev, [id]: true }));
    setTimeout(
      () => setCopyState((prev) => ({ ...prev, [id]: false })),
      1500
    );
  }

  useEffect(() => {
    if (!session || !workspaceId) return;

    apiFetch(`/api/v1/workspaces/${workspaceId}/accept-invite`, {
      method: "POST",
    })
      .then(async () => {
        const [wsData, colData, memData] = await Promise.all([
          apiFetch<{ workspace: Workspace }>(
            `/api/v1/workspaces/${workspaceId}`
          ),
          apiFetch<{ collections: CollectionSummary[] }>(
            `/api/v1/collections?workspace_id=${workspaceId}`
          ),
          apiFetch<{ members: Member[] }>(
            `/api/v1/workspaces/${workspaceId}/members`
          ),
        ]);
        setWorkspace(wsData.workspace);
        setCollections(colData.collections);
        setMembers(memData.members);
        setStatus("welcome");
      })
      .catch((e) => {
        setStatus("error");
        setError(e.message);
      });
  }, [session, workspaceId]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">TeamMem</h1>
          <p className="text-sm text-gray-500 mb-6">
            You've been invited to a shared workspace. Sign in or create an
            account to join.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors text-center"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">
          Joining workspace...
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">TeamMem</h1>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Link
            to="/dashboard"
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const otherMembers = members.filter((m) => m.id !== session?.user?.id);
  const firstConnected = collections.find((c) => c.source_id);
  const firstNative = collections.find((c) => !c.source_id);
  const apiUrl = apiUrlForMcp();
  const mcpConfig = rawKey
    ? buildMcpConfig(rawKey, workspaceId || "", apiUrl)
    : null;

  const sampleQuery = firstConnected
    ? `What's in our ${firstConnected.name}?`
    : firstNative
      ? `What decisions are in ${firstNative.name}?`
      : `What collections are available in this workspace?`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're in</h1>
          <p className="text-sm text-gray-500 mt-1">
            Joined{" "}
            <span className="font-medium text-gray-800">
              {workspace?.name}
            </span>
            {otherMembers.length > 0 && (
              <>
                {" "}· {otherMembers.length} teammate
                {otherMembers.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>

        {/* ─── Password setup (invited users only) ─── */}
        {showPasswordSetup && !passwordSaved && (
          <div className="mb-5 bg-white rounded-2xl border border-blue-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                1
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  Set a password
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  So you can sign back in without needing another email link.
                </p>
                <form onSubmit={handleSetPassword} className="space-y-2">
                  <input
                    type="password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    required
                    minLength={8}
                    placeholder="New password (min 8 chars)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Confirm password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {passwordError && (
                    <p className="text-xs text-red-600">{passwordError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={
                      passwordSubmitting ||
                      !passwordValue ||
                      !passwordConfirm
                    }
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {passwordSubmitting ? "Saving..." : "Save password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {passwordSaved && (
          <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-600 shrink-0"
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
            <span className="text-sm text-green-800">
              Password set. You can now sign in any time with email + password.
            </span>
          </div>
        )}

        {/* ─── PRIMARY ACTION: Connect your AI ─── */}
        <div className="mb-5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-br from-blue-50 to-violet-50 border-b border-gray-200">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {showPasswordSetup && !passwordSaved ? "2" : "1"}
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">
                  Connect your AI
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Generate a key, paste into your AI tool, ask a question.
                  Takes 30 seconds.
                </p>
              </div>
            </div>
          </div>

          {/* Tool picker */}
          <div className="flex gap-1 px-5 pt-4">
            {(
              [
                { id: "claude" as const, label: "Claude Desktop" },
                { id: "cursor" as const, label: "Cursor" },
                { id: "other" as const, label: "Other MCP tool" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tool === t.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-5 py-4">
            {!rawKey ? (
              <>
                <button
                  onClick={handleGenerateKey}
                  disabled={generating}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {generating
                    ? "Generating..."
                    : `Generate key for ${
                        tool === "claude"
                          ? "Claude Desktop"
                          : tool === "cursor"
                            ? "Cursor"
                            : "my AI tool"
                      }`}
                </button>
                {genError && (
                  <p className="mt-2 text-xs text-red-600">{genError}</p>
                )}
                <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                  Creates a scoped key with full access to this workspace.
                  You can tighten permissions later from Settings.
                </p>
              </>
            ) : (
              <div className="space-y-4">
                {/* Step A: Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Your key (copy now — won't be shown again)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 select-all break-all">
                      {rawKey}
                    </code>
                    <button
                      onClick={() => copy("key", rawKey)}
                      className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors shrink-0"
                    >
                      {copyState.key ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Step B: Config */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      {tool === "claude"
                        ? "Config for Claude Desktop"
                        : tool === "cursor"
                          ? "Config for Cursor (.cursor/mcp.json)"
                          : "MCP config"}
                    </span>
                    <button
                      onClick={() => copy("config", mcpConfig || "")}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      {copyState.config ? "Copied!" : "Copy config"}
                    </button>
                  </div>
                  <pre className="bg-gray-950 text-gray-300 rounded-lg p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
                    {mcpConfig}
                  </pre>
                </div>

                {/* Step C: Install instructions */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Where to paste this
                  </p>
                  {tool === "claude" && (
                    <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Claude Desktop → Settings → Developer → Edit Config</li>
                      <li>Paste the config above and save</li>
                      <li>Restart Claude Desktop</li>
                    </ol>
                  )}
                  {tool === "cursor" && (
                    <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                      <li>
                        Create{" "}
                        <code className="bg-white px-1 rounded">
                          .cursor/mcp.json
                        </code>{" "}
                        at your project root
                      </li>
                      <li>Paste the config above and save</li>
                      <li>
                        Cursor → Settings → MCP → verify "teammem" is
                        connected
                      </li>
                    </ol>
                  )}
                  {tool === "other" && (
                    <div className="text-xs text-gray-700">
                      <p className="mb-1.5">
                        Any MCP-compatible tool can connect using these env
                        vars:
                      </p>
                      <div className="space-y-0.5 font-mono text-[11px]">
                        <div>
                          <span className="text-gray-500">TEAMMEM_API_KEY=</span>
                          <span className="text-green-700">{rawKey}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            TEAMMEM_WORKSPACE=
                          </span>
                          <span className="text-blue-700">{workspaceId}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">TEAMMEM_API_URL=</span>
                          <span className="text-gray-700">{apiUrl}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step D: Try a query */}
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-violet-800 uppercase tracking-wider mb-1.5">
                    Try asking
                  </p>
                  <button
                    onClick={() => copy("sample", sampleQuery)}
                    className="w-full text-left bg-white rounded-md px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors group flex items-center justify-between gap-2"
                  >
                    <span className="italic">"{sampleQuery}"</span>
                    <span className="text-[11px] text-violet-600 group-hover:underline font-medium shrink-0">
                      {copyState.sample ? "Copied!" : "Copy"}
                    </span>
                  </button>
                  <p className="mt-1.5 text-[11px] text-violet-700">
                    Your AI will use{" "}
                    <code className="bg-white px-1 rounded">search</code> or{" "}
                    <code className="bg-white px-1 rounded">
                      query_structured
                    </code>{" "}
                    against this workspace automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── What your AI will see (detailed) ─── */}
        <div
          className={`mb-5 bg-white rounded-2xl border shadow-sm overflow-hidden ${
            rawKey ? "border-green-200" : "border-gray-200"
          }`}
        >
          <div
            className={`px-5 py-4 border-b ${
              rawKey
                ? "border-green-100 bg-green-50/40"
                : "border-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {rawKey && (
                <svg
                  className="w-4 h-4 text-green-600 shrink-0"
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
              )}
              <h2
                className={`text-sm font-semibold ${
                  rawKey ? "text-green-900" : "text-gray-800"
                }`}
              >
                {rawKey
                  ? "Your AI now has access to"
                  : "What your AI will see"}
              </h2>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {rawKey ? (
                <>
                  With the key you just generated, your agent can{" "}
                  <span className="font-medium text-gray-800">read</span>{" "}
                  everything below. It can{" "}
                  <span className="font-medium text-gray-800">write</span>{" "}
                  only to native collections — synced tables stay read-only.
                </>
              ) : (
                <>
                  Your agent will be able to{" "}
                  <span className="font-medium text-gray-700">read</span>{" "}
                  everything below. It can{" "}
                  <span className="font-medium text-gray-700">write</span>{" "}
                  only to native collections — synced tables are read-only
                  mirrors of an external database.
                </>
              )}
            </p>
          </div>

          {collections.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-500">
                No collections yet — your team is just getting started. Your
                AI will see data here as your teammates connect it.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {collections.map((c) => {
                const synced = Boolean(c.source_id);
                const cols = c.source_config?.columns || [];
                const contentCol = c.source_config?.content_column;
                return (
                  <div key={c.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {c.name}
                        </span>
                        {synced ? (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                            read-only · synced
                          </span>
                        ) : (
                          <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                            read + write
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {c.entry_count.toLocaleString()}{" "}
                        {synced ? "rows" : "entries"}
                      </span>
                    </div>

                    {synced && c.source_config ? (
                      <div className="space-y-1.5 pl-0.5">
                        <p className="text-[11px] text-gray-500">
                          Mirrored from{" "}
                          <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded font-mono text-[10px]">
                            {c.source_config.table}
                          </code>
                          {c.last_sync_at && (
                            <>
                              {" "}
                              ·{" "}
                              <span title={new Date(c.last_sync_at).toLocaleString()}>
                                last synced {formatRelative(c.last_sync_at)}
                              </span>
                            </>
                          )}
                          {!c.last_sync_at && (
                            <>
                              {" "}
                              · <span className="text-amber-600">awaiting first sync</span>
                            </>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {cols.map((col) => (
                            <span
                              key={col}
                              className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                                col === contentCol
                                  ? "bg-violet-50 text-violet-700 border-violet-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                              title={
                                col === contentCol
                                  ? "Content column — indexed for semantic search"
                                  : "Structured column"
                              }
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                        {contentCol && (
                          <p className="text-[10px] text-violet-600">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 align-middle mr-1" />
                            <code className="font-mono">{contentCol}</code> is
                            indexed for semantic search
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 pl-0.5">
                        {c.collection_type === "documents"
                          ? "Freeform entries (notes, decisions, summaries) your team and agents write here."
                          : c.collection_type === "structured"
                            ? "Structured entries (rows with fields) your team or agents write."
                            : "Mixed: structured fields plus freeform content."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {otherMembers.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Who else is here
              </p>
              <div className="flex flex-wrap gap-1.5">
                {otherMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-white text-gray-700 px-2 py-0.5 rounded-full border border-gray-200"
                  >
                    {m.name || m.email}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Secondary CTA ─── */}
        <Link
          to={`/w/${workspaceId}`}
          className="block w-full text-center bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Go to the workspace UI
        </Link>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          Tighten permissions for this key from{" "}
          <Link
            to={`/w/${workspaceId}/settings?tab=agents`}
            className="underline hover:text-gray-600"
          >
            Settings → Agent Keys
          </Link>{" "}
          once you're ready.
        </p>
      </div>
    </div>
  );
}

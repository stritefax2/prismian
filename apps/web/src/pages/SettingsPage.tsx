import { useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";
import { AppShell } from "../components/AppShell.js";
import { ConnectDataSource } from "../components/ConnectDataSource.js";
import { ConnectedCollectionSetup } from "../components/ConnectedCollectionSetup.js";
import { ActivityFeed } from "../components/ActivityFeed.js";
import { NewKeyPanel } from "../components/NewKeyPanel.js";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accepted_at: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invited_at: string;
}

interface AgentKeyInfo {
  id: string;
  name: string;
  permissions: Record<string, unknown>;
  last_used_at: string | null;
  last_four: string | null;
  created_at: string;
}

interface DataSourceInfo {
  id: string;
  workspace_id: string;
  name: string;
  source_type: string;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

interface WorkspaceCollection {
  id: string;
  name: string;
  collection_type: string;
  source_id: string | null;
  source_config: {
    table: string;
    columns: string[];
  } | null;
}

type ColPerms = {
  read: boolean;
  write: boolean;
  delete: boolean;
  deny_fields: Set<string>;
};

type Tab = "workspace" | "sources" | "agents" | "members" | "audit";

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 60 * 1000) return "just now";
  if (delta < 60 * 60 * 1000) {
    const m = Math.round(delta / 60000);
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }
  if (delta < 24 * 60 * 60 * 1000) {
    const h = Math.round(delta / 3600000);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (delta < 30 * 24 * 60 * 60 * 1000) {
    const d = Math.round(delta / 86400000);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}

function summarizeScope(permissions: Record<string, unknown>): string {
  if (permissions.collections === "*") return "Full access";
  const cols = (permissions.collections as Record<string, unknown>) || {};
  const collectionCount = Object.keys(cols).length;
  const fieldRestrictions =
    (permissions.field_restrictions as Record<
      string,
      { deny_fields?: string[] }
    >) || {};
  const redactedCount = Object.values(fieldRestrictions).reduce(
    (n, r) => n + (r.deny_fields?.length ?? 0),
    0
  );
  const parts: string[] = [];
  parts.push(
    `${collectionCount} collection${collectionCount === 1 ? "" : "s"}`
  );
  if (redactedCount > 0) {
    parts.push(
      `${redactedCount} redacted field${redactedCount === 1 ? "" : "s"}`
    );
  }
  return parts.join(" · ");
}

export function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "members";
  const [tab, setTabState] = useState<Tab>(
    ["workspace", "members", "agents", "sources", "audit"].includes(
      initialTab
    )
      ? initialTab
      : "workspace"
  );
  const fromOnboarding = searchParams.get("onboarding") === "1";

  function setTab(next: Tab) {
    setTabState(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [agentKeys, setAgentKeys] = useState<AgentKeyInfo[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [showKeyForm, setShowKeyForm] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [keyAccess, setKeyAccess] = useState<"all" | "scoped">("all");
  const [newRawKey, setNewRawKey] = useState("");
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [showConnectSource, setShowConnectSource] = useState(false);
  const [setupFromSource, setSetupFromSource] = useState<DataSourceInfo | null>(
    null
  );

  const [workspaceCollections, setWorkspaceCollections] = useState<
    WorkspaceCollection[]
  >([]);
  const [scopedPerms, setScopedPerms] = useState<Record<string, ColPerms>>({});

  function loadMembers() {
    if (!id) return;
    apiFetch<{ members: Member[]; pending_invites: PendingInvite[] }>(
      `/api/v1/workspaces/${id}/members`
    ).then((data) => {
      setMembers(data.members);
      setPendingInvites(data.pending_invites || []);
    });
  }

  function loadDataSources() {
    if (!id) return;
    apiFetch<{ data_sources: DataSourceInfo[] }>(
      `/api/v1/data-sources?workspace_id=${id}`
    ).then((data) => setDataSources(data.data_sources));
  }

  useEffect(() => {
    loadMembers();
    if (!id) return;
    apiFetch<{ workspace: { name: string } }>(`/api/v1/workspaces/${id}`).then(
      (data) => setWorkspaceName(data.workspace.name)
    );
    apiFetch<{ agent_keys: AgentKeyInfo[] }>(
      `/api/v1/agent-keys?workspace_id=${id}`
    ).then((data) => setAgentKeys(data.agent_keys));
    loadDataSources();
    apiFetch<{ collections: WorkspaceCollection[] }>(
      `/api/v1/collections?workspace_id=${id}`
    ).then((data) => {
      setWorkspaceCollections(data.collections);
      const init: Record<string, ColPerms> = {};
      for (const col of data.collections) {
        init[col.name] = {
          read: true,
          write: !col.source_id,
          delete: false,
          deny_fields: new Set(),
        };
      }
      setScopedPerms(init);

      // Deep-link: ?tab=agents&new=1&collection=<id> opens the create-key
      // form pre-scoped to a single collection (read access only). Used
      // by the "+ Agent key for this data" button on a synced collection.
      const wantsNew = searchParams.get("new") === "1";
      const targetCollectionId = searchParams.get("collection");
      if (wantsNew && targetCollectionId) {
        const target = data.collections.find(
          (c) => c.id === targetCollectionId
        );
        if (target) {
          const prefilled: Record<string, ColPerms> = {};
          for (const col of data.collections) {
            prefilled[col.name] = {
              read: col.id === targetCollectionId,
              write: false,
              delete: false,
              deny_fields: new Set(),
            };
          }
          setScopedPerms(prefilled);
          setKeyAccess("scoped");
          setKeyName(`Claude Desktop — ${target.name}`);
          setShowKeyForm(true);
        }
        // Clear the query params so a refresh doesn't keep re-opening
        // the form on every navigation back to Settings.
        const params = new URLSearchParams(searchParams);
        params.delete("new");
        params.delete("collection");
        setSearchParams(params, { replace: true });
      }
    });
  }, [id]);

  async function handleDeleteDataSource(sourceId: string) {
    if (
      !confirm(
        "Remove this data source? All connected collections from this source will be deleted."
      )
    )
      return;
    await apiFetch(`/api/v1/data-sources/${sourceId}`, { method: "DELETE" });
    setDataSources((prev) => prev.filter((ds) => ds.id !== sourceId));
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    try {
      const data = await apiFetch<{ message: string; status: string }>(
        `/api/v1/workspaces/${id}/invite`,
        {
          method: "POST",
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );
      setInviteEmail("");
      setInviteSuccess(
        data.status === "added"
          ? `${inviteEmail} has been added to the workspace.`
          : `Invite sent to ${inviteEmail}. They'll get an email to join.`
      );
      loadMembers();
    } catch (err: any) {
      setInviteError(err.message);
    }
  }

  async function handleSaveKey(e: FormEvent) {
    e.preventDefault();

    let permissions: Record<string, unknown>;
    if (keyAccess === "all") {
      permissions = { collections: "*" as const };
    } else {
      const collections: Record<string, Array<"read" | "write" | "delete">> =
        {};
      const field_restrictions: Record<string, { deny_fields: string[] }> = {};
      for (const col of workspaceCollections) {
        const p = scopedPerms[col.name];
        if (!p) continue;
        const actions: Array<"read" | "write" | "delete"> = [];
        if (p.read) actions.push("read");
        if (p.write && !col.source_id) actions.push("write");
        if (p.delete && !col.source_id) actions.push("delete");
        if (actions.length > 0) {
          collections[col.name] = actions;
        }
        if (p.deny_fields.size > 0) {
          field_restrictions[col.name] = {
            deny_fields: Array.from(p.deny_fields),
          };
        }
      }
      permissions = {
        collections,
        ...(Object.keys(field_restrictions).length > 0
          ? { field_restrictions }
          : {}),
      };
    }

    if (editingKeyId) {
      // PUT — change scope/name on an existing key without rotating the
      // secret. Tools using the key keep working.
      const data = await apiFetch<{ agent_key: AgentKeyInfo }>(
        `/api/v1/agent-keys/${editingKeyId}`,
        {
          method: "PUT",
          body: JSON.stringify({ name: keyName, permissions }),
        }
      );
      setAgentKeys((prev) =>
        prev.map((k) => (k.id === editingKeyId ? data.agent_key : k))
      );
    } else {
      const data = await apiFetch<{ agent_key: AgentKeyInfo; raw_key: string }>(
        "/api/v1/agent-keys",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: id,
            name: keyName,
            permissions,
          }),
        }
      );
      setNewRawKey(data.raw_key);
      setAgentKeys((prev) => [data.agent_key, ...prev]);
    }

    setKeyName("");
    setEditingKeyId(null);
    setShowKeyForm(false);
  }

  // Reconstruct the form state from a stored key's permissions object so
  // the edit dialog opens prefilled with what's already deployed.
  function startEditKey(key: AgentKeyInfo) {
    const perms = key.permissions as {
      collections?: "*" | Record<string, string[]>;
      field_restrictions?: Record<string, { deny_fields?: string[] }>;
    };
    setKeyName(key.name);
    if (perms.collections === "*" || perms.collections === undefined) {
      setKeyAccess("all");
    } else {
      setKeyAccess("scoped");
      const colMap = perms.collections as Record<string, string[]>;
      const next: Record<string, ColPerms> = {};
      for (const col of workspaceCollections) {
        const allowed = colMap[col.name] ?? [];
        const denyFields =
          perms.field_restrictions?.[col.name]?.deny_fields ?? [];
        next[col.name] = {
          read: allowed.includes("read"),
          write: allowed.includes("write"),
          delete: allowed.includes("delete"),
          deny_fields: new Set(denyFields),
        };
      }
      setScopedPerms(next);
    }
    setEditingKeyId(key.id);
    setShowKeyForm(true);
  }

  function cancelKeyForm() {
    setShowKeyForm(false);
    setEditingKeyId(null);
    setKeyName("");
  }

  function updatePerm<K extends keyof ColPerms>(
    collectionName: string,
    key: K,
    value: ColPerms[K]
  ) {
    setScopedPerms((prev) => ({
      ...prev,
      [collectionName]: {
        ...prev[collectionName],
        [key]: value,
      },
    }));
  }

  function toggleDenyField(collectionName: string, col: string) {
    setScopedPerms((prev) => {
      const existing = prev[collectionName];
      if (!existing) return prev;
      const next = new Set(existing.deny_fields);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return {
        ...prev,
        [collectionName]: { ...existing, deny_fields: next },
      };
    });
  }

  async function handleDeleteKey(keyId: string) {
    await apiFetch(`/api/v1/agent-keys/${keyId}`, { method: "DELETE" });
    setAgentKeys((prev) => prev.filter((k) => k.id !== keyId));
    setConfirmRevokeId(null);
  }

  async function handleDeleteWorkspace() {
    if (!id) return;
    setDeletingWorkspace(true);
    setDeleteError("");
    try {
      await apiFetch(`/api/v1/workspaces/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm_name: confirmDeleteName }),
      });
      // Pass the deleted name as a query param so the dashboard can
      // render a flash confirmation. Without this the user just
      // teleports to a different page and has no proof the delete
      // actually completed.
      const params = new URLSearchParams({
        deleted: confirmDeleteName,
      });
      navigate(`/dashboard?${params.toString()}`);
    } catch (err: any) {
      setDeleteError(
        err.message || "Couldn't delete this workspace — try again."
      );
    } finally {
      setDeletingWorkspace(false);
    }
  }

  // True only if the current user is a confirmed owner of this workspace.
  // Editors and viewers don't see the Danger Zone at all.
  const currentUserRole = members.find((m) => m.id === user?.id)?.role;
  const isOwner = currentUserRole === "owner";

  return (
    <AppShell
      workspaceId={id}
      breadcrumbs={[
        { label: "Workspace", to: `/w/${id}` },
        { label: "Settings" },
      ]}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {fromOnboarding && tab === "sources" && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-md flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Last step — connect a data source
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add a Postgres connection. Your agents get scoped, audited
                read access to the tables you pick.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(
            [
              { id: "workspace", label: "Workspace" },
              { id: "sources", label: "Data sources" },
              { id: "agents", label: "Agent keys" },
              { id: "members", label: "Members" },
              { id: "audit", label: "Audit log" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "sources" && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4">
              <p className="text-sm text-gray-600">
                Each data source is a read-only connection to an external
                database. Agents read through scoped collections — never
                directly, never with write access.
              </p>
              <button
                onClick={() => setShowConnectSource(true)}
                className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0"
              >
                Connect data source
              </button>
            </div>

            {dataSources.length === 0 ? (
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10m-8-14v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  No data sources yet
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                  Connect a Postgres database to let your agents read from it
                  through scoped collections.
                </p>
                <button
                  onClick={() => setShowConnectSource(true)}
                  className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Connect your first database
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {dataSources.map((ds) => (
                  <div
                    key={ds.id}
                    className="flex items-center justify-between px-4 py-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {ds.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ds.source_type} ·{" "}
                        {ds.last_sync_at
                          ? `last activity ${new Date(ds.last_sync_at).toLocaleString()}`
                          : "no syncs yet"}
                      </p>
                      {ds.last_sync_error && (
                        <p className="text-xs text-red-600 mt-1 truncate max-w-md">
                          {ds.last_sync_error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          ds.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ds.status === "error"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {ds.status}
                      </span>
                      <button
                        onClick={() => setSetupFromSource(ds)}
                        className="text-xs bg-white border border-gray-200 text-gray-800 hover:border-gray-300 px-2.5 py-1 rounded-md font-medium"
                      >
                        Add collection
                      </button>
                      <button
                        onClick={() => handleDeleteDataSource(ds.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showConnectSource && id && (
              <ConnectDataSource
                workspaceId={id}
                onClose={() => setShowConnectSource(false)}
                onConnected={(ds) => {
                  setShowConnectSource(false);
                  setDataSources((prev) => [ds as DataSourceInfo, ...prev]);
                  setSetupFromSource(ds as DataSourceInfo);
                }}
              />
            )}

            {setupFromSource && id && (
              <ConnectedCollectionSetup
                workspaceId={id}
                dataSourceId={setupFromSource.id}
                dataSourceName={setupFromSource.name}
                onClose={() => setSetupFromSource(null)}
                onCreated={(collection) => {
                  setSetupFromSource(null);
                  loadDataSources();
                  // Jump the user straight to the new collection so they
                  // can watch it sync and see their data — not leave them
                  // stranded in settings wondering where it went.
                  navigate(`/w/${id}/c/${collection.id}`);
                }}
              />
            )}
          </div>
        )}

        {tab === "members" && (
          <div>
            <p className="text-sm text-gray-600 mb-2 max-w-2xl leading-relaxed">
              Invite teammates so their AI tools can read the same connected
              data and shared collections. Each member can generate their
              own scoped agent keys — your DB credentials are never shared.
            </p>
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md p-3 max-w-2xl">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                trust model
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                Anyone you invite to this workspace sees{" "}
                <span className="font-medium text-gray-900">every collection here</span>{" "}
                — including columns marked redacted for agents. Workspaces
                are the unit of trust. Use separate workspaces if different
                people should see different data. The fine-grained scoping
                lives on{" "}
                <em className="not-italic font-medium text-gray-900">
                  agent keys
                </em>
                , not on member roles.
              </p>
            </div>

            {/* Invite form */}
            <form
              onSubmit={handleInvite}
              className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4 bg-white border border-gray-200 rounded-md p-4"
            >
              <label className="flex-1">
                <span className="text-xs font-medium text-gray-700">
                  Invite by email
                </span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-gray-700">Role</span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 block w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  title="Member: full read/write within this workspace. Owner: same, plus can delete the workspace."
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <button
                type="submit"
                className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
              >
                Send invite
              </button>
            </form>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="mb-4 p-3 bg-emerald-50/60 border border-emerald-200 text-emerald-800 rounded-md text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {inviteSuccess}
              </div>
            )}

            {/* Active members */}
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Members ({members.length})
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 mb-6">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium">
                      {(m.name || m.email).charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {m.name || m.email}
                      </p>
                      {m.name && (
                        <p className="text-xs text-gray-500">{m.email}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded">
                    {m.role === "owner" ? "owner" : "member"}
                  </span>
                </div>
              ))}
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Pending Invites ({pendingInvites.length})
                </h3>
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm divide-y divide-gray-100">
                  {pendingInvites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-medium">
                          ?
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {inv.email}
                          </p>
                          <p className="text-xs text-gray-400">
                            Invited{" "}
                            {new Date(inv.invited_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                          pending · {inv.role === "owner" ? "owner" : "member"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        )}

        {tab === "workspace" && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-md p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                About this workspace
              </h3>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Name
                  </dt>
                  <dd className="text-gray-900 font-medium">
                    {workspaceName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Members
                  </dt>
                  <dd className="text-gray-900">
                    {members.length}{" "}
                    {pendingInvites.length > 0 && (
                      <span className="text-gray-500 text-xs">
                        · {pendingInvites.length} pending invite
                        {pendingInvites.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Data sources
                  </dt>
                  <dd className="text-gray-900">{dataSources.length}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Agent keys
                  </dt>
                  <dd className="text-gray-900">{agentKeys.length}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                Workspace ID:{" "}
                <code className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">
                  {id}
                </code>
              </p>
            </div>

            {/* Danger Zone — owners only. Hard to undo, easy to type past. */}
            {isOwner && workspaceName && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-red-600">
                    Danger zone
                  </h3>
                </div>
                <div className="bg-white border border-red-200 rounded-md overflow-hidden">
                  <div className="p-4 border-b border-red-100">
                    <p className="text-sm font-semibold text-gray-900">
                      Delete this workspace
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Permanently removes the workspace and{" "}
                      <span className="font-medium text-gray-900">
                        every collection, entry, agent key, audit record,
                        and connected source
                      </span>{" "}
                      under it. Connected source databases are{" "}
                      <span className="font-medium text-gray-900">not</span>{" "}
                      touched — only Prismian's mirror of them. This cannot
                      be undone.
                    </p>
                  </div>
                  <div className="p-4 bg-red-50/40">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-700">
                        Type{" "}
                        <code className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-900">
                          {workspaceName}
                        </code>{" "}
                        to confirm
                      </span>
                      <input
                        type="text"
                        value={confirmDeleteName}
                        onChange={(e) =>
                          setConfirmDeleteName(e.target.value)
                        }
                        placeholder={workspaceName}
                        className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                      />
                    </label>
                    {deleteError && (
                      <p className="mt-2 text-xs text-red-700">
                        {deleteError}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleDeleteWorkspace}
                        disabled={
                          deletingWorkspace ||
                          confirmDeleteName !== workspaceName
                        }
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingWorkspace
                          ? "Deleting…"
                          : "Delete workspace permanently"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "agents" && (
          <div>
            {newRawKey && (
              <div className="mb-6">
                <NewKeyPanel
                  rawKey={newRawKey}
                  workspaceId={id ?? ""}
                  onDismiss={() => setNewRawKey("")}
                />
              </div>
            )}

            <div className="flex items-center justify-between mb-4 gap-4">
              <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                Agent keys let AI tools read your connected data and read/write
                native collections via MCP. Each key has its own scope — table
                access, column redaction, rate limits — enforced at the API
                layer.
              </p>
              <button
                onClick={() => setShowKeyForm(true)}
                className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0"
              >
                New agent key
              </button>
            </div>

            {showKeyForm && (
              <form
                onSubmit={handleSaveKey}
                className="mb-6 bg-white p-5 rounded-md border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {editingKeyId ? "Edit agent key" : "New agent key"}
                  </h3>
                  {editingKeyId && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                      key value unchanged · tools keep working
                    </span>
                  )}
                </div>
                <label className="block mb-3">
                  <span className="text-xs font-medium text-gray-700">
                    Key name
                  </span>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Claude Desktop, Cursor, CI Bot"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-xs font-medium text-gray-700">
                    Access level
                  </span>
                  <select
                    value={keyAccess}
                    onChange={(e) =>
                      setKeyAccess(e.target.value as "all" | "scoped")
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  >
                    <option value="all">
                      Full access — read all, write to native collections
                    </option>
                    <option value="scoped">
                      Scoped — pick tables and redact columns
                    </option>
                  </select>
                  <span className="block mt-1.5 text-xs text-gray-500 leading-relaxed">
                    Connected tables are always read-only to agents —
                    structural, not configurable. Writes only go to native
                    collections.
                  </span>
                </label>

                {keyAccess === "scoped" &&
                  workspaceCollections.length > 0 && (
                    <div className="mb-4 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
                      {workspaceCollections.map((col) => {
                        const p = scopedPerms[col.name];
                        if (!p) return null;
                        const isConnected = Boolean(col.source_id);
                        const columnsForRedaction =
                          col.source_config?.columns || [];
                        return (
                          <div key={col.id} className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {col.name}
                                  </p>
                                  {isConnected && (
                                    <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      synced
                                    </span>
                                  )}
                                </div>
                                {col.source_config && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    <code className="font-mono">
                                      {col.source_config.table}
                                    </code>
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs shrink-0">
                                <label className="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={p.read}
                                    onChange={(e) =>
                                      updatePerm(
                                        col.name,
                                        "read",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  read
                                </label>
                                <label
                                  className={`inline-flex items-center gap-1.5 ${
                                    isConnected ? "opacity-40" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={p.write && !isConnected}
                                    disabled={isConnected}
                                    onChange={(e) =>
                                      updatePerm(
                                        col.name,
                                        "write",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  write
                                </label>
                                <label
                                  className={`inline-flex items-center gap-1.5 ${
                                    isConnected ? "opacity-40" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={p.delete && !isConnected}
                                    disabled={isConnected}
                                    onChange={(e) =>
                                      updatePerm(
                                        col.name,
                                        "delete",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  delete
                                </label>
                              </div>
                            </div>

                            {isConnected &&
                              p.read &&
                              columnsForRedaction.length > 0 && (
                                <details className="mt-2 group">
                                  <summary className="text-xs text-gray-700 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 cursor-pointer select-none list-none">
                                    Redact columns ({p.deny_fields.size}{" "}
                                    of {columnsForRedaction.length} hidden)
                                  </summary>
                                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-2">
                                    {columnsForRedaction.map((colName) => (
                                      <label
                                        key={colName}
                                        className="inline-flex items-center gap-1.5 text-xs"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={p.deny_fields.has(
                                            colName
                                          )}
                                          onChange={() =>
                                            toggleDenyField(
                                              col.name,
                                              colName
                                            )
                                          }
                                        />
                                        <code className="font-mono text-gray-700 truncate">
                                          {colName}
                                        </code>
                                      </label>
                                    ))}
                                  </div>
                                  <p className="mt-1.5 text-[11px] text-gray-500 pl-2">
                                    Checked columns are hidden from this
                                    agent — enforced before data leaves the
                                    API.
                                  </p>
                                </details>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                {keyAccess === "scoped" &&
                  workspaceCollections.length === 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      No collections yet. Create a collection (or connect a
                      data source) before creating a scoped key.
                    </div>
                  )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    {editingKeyId ? "Save changes" : "Create key"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelKeyForm}
                    className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {agentKeys.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">
                    No agent keys yet. Create one to connect AI tools.
                  </p>
                </div>
              ) : (
                agentKeys.map((key) => {
                  const isConfirming = confirmRevokeId === key.id;
                  const lastUsed = formatRelative(key.last_used_at);
                  const usedRecently =
                    key.last_used_at &&
                    Date.now() - new Date(key.last_used_at).getTime() <
                      10 * 60 * 1000;
                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {key.name}
                          </p>
                          {key.last_four && (
                            <code
                              className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                              title="Last 4 characters of this key — use to identify which tool is using it"
                            >
                              pr_sk_••••{key.last_four}
                            </code>
                          )}
                          {usedRecently && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full"
                              title="This key was used in the last 10 minutes"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="text-gray-700">
                            Last used {lastUsed}
                          </span>
                          {" · "}
                          Created {formatRelative(key.created_at)}
                          {" · "}
                          {summarizeScope(key.permissions)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isConfirming ? (
                          <>
                            <span className="text-xs text-red-600">
                              Revoke this key?
                            </span>
                            <button
                              onClick={() => handleDeleteKey(key.id)}
                              className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-md font-medium hover:bg-red-700"
                            >
                              Revoke now
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditKey(key)}
                              className="text-xs text-gray-700 hover:text-gray-900 hover:underline underline-offset-2 decoration-gray-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmRevokeId(key.id)}
                              className="text-xs text-red-500 hover:text-red-700 hover:underline"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === "audit" && id && <AuditPanel workspaceId={id} />}
      </main>
    </AppShell>
  );
}

function AuditPanel({ workspaceId }: { workspaceId: string }) {
  const [limit, setLimit] = useState<50 | 100 | 250>(100);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
          Every read, write, and delete by every actor — agent or human —
          is recorded here with row IDs and timestamps. Compliance-ready
          from day one.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={limit}
            onChange={(e) =>
              setLimit(Number(e.target.value) as 50 | 100 | 250)
            }
            className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
          </select>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-xs bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-5">
        <ActivityFeed
          workspaceId={workspaceId}
          limit={limit}
          refreshKey={refreshKey}
        />
      </div>

      <p className="mt-3 text-xs text-gray-400 leading-relaxed">
        For full export, query{" "}
        <code className="bg-gray-100 border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono">
          GET /api/v1/audit/{workspaceId}
        </code>{" "}
        with an admin agent key.
      </p>
    </div>
  );
}

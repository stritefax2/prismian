import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  settings: Record<string, unknown>;
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deletedFlash = searchParams.get("deleted");
  const userEmail = user?.email ?? "";
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ workspaces: Workspace[] }>("/api/v1/workspaces")
      .then((data) => {
        setWorkspaces(data.workspaces);
        if (data.workspaces.length === 0) {
          navigate("/onboarding", { replace: true });
        }
        // Don't auto-redirect from /dashboard when length === 1.
        // The user navigated here on purpose — they want to see the
        // list (to create another workspace, switch, or just look).
        // The first-login post-auth flow lives on HomePage / and is
        // free to be smarter about destination.
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch<{ workspace: Workspace }>(
        "/api/v1/workspaces",
        {
          method: "POST",
          body: JSON.stringify({ name: newName }),
        }
      );
      setWorkspaces((prev) => [data.workspace, ...prev]);
      setNewName("");
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Prismian</h1>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-gray-500">{userEmail}</span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {deletedFlash && (
          <div className="mb-4 bg-emerald-50/60 border border-emerald-200 rounded-md p-3 flex items-center justify-between gap-3">
            <p className="text-sm text-emerald-900 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                Workspace{" "}
                <span className="font-medium">{deletedFlash}</span>{" "}
                deleted. All collections, entries, agent keys, and
                audit records were removed.
              </span>
            </p>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete("deleted");
                setSearchParams(params, { replace: true });
              }}
              className="text-emerald-700/70 hover:text-emerald-900 text-base leading-none shrink-0"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Workspaces</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            New workspace
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-6 flex gap-3 items-end bg-white p-4 rounded-lg border border-gray-200"
          >
            <label className="flex-1">
              <span className="text-sm font-medium text-gray-700">
                Workspace name
              </span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Acme Corp, Product Team"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
              />
            </label>
            <button
              type="submit"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
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
        )}

        <div className="grid gap-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/w/${ws.id}`}
              className="block bg-white p-5 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 group-hover:text-gray-900 transition-colors">
                  {ws.name}
                </h3>
                <svg
                  className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors"
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
              <p className="text-xs text-gray-400 mt-1">
                Created {new Date(ws.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

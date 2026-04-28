import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
          <h1 className="text-xl font-bold text-gray-900">TeamMem</h1>
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
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Workspaces</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
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
        )}

        <div className="grid gap-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/w/${ws.id}`}
              className="block bg-white p-5 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {ws.name}
                </h3>
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

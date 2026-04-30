import { useState, type ReactNode, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { apiFetch } from "../lib/api.js";

interface SearchResult {
  entry_id: string;
  collection_id: string;
  collection: string;
  content: string | null;
  structured_data: Record<string, unknown> | null;
  relevance_score: number;
}

export function AppShell({
  children,
  workspaceId,
  workspaceName,
  breadcrumbs,
}: {
  children: ReactNode;
  workspaceId?: string;
  workspaceName?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || !workspaceId) return;
    setSearching(true);
    try {
      const data = await apiFetch<{ results: SearchResult[] }>(
        "/api/v1/search",
        {
          method: "POST",
          body: JSON.stringify({
            query: searchQuery,
            workspace_id: workspaceId,
            limit: 5,
          }),
        }
      );
      setSearchResults(data.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm shrink-0">
            <Link
              to="/dashboard"
              className="font-bold text-gray-900 hover:text-gray-900 transition-colors"
            >
              Prismian
            </Link>
            {breadcrumbs?.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-gray-300">/</span>
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="text-gray-500 hover:text-gray-700 transition-colors max-w-[150px] truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium max-w-[200px] truncate">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Global search */}
          {workspaceId && (
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-md mx-auto relative"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) clearSearch();
                }}
                placeholder="Search collections, entries, synced data..."
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 pl-8 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:bg-white outline-none transition-colors"
              />
              <svg
                className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              {/* Search results dropdown */}
              {searchResults !== null && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
                  {searching ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No results for "{searchQuery}"
                    </div>
                  ) : (
                    <div>
                      {searchResults.map((r) => (
                        <button
                          key={r.entry_id}
                          type="button"
                          onClick={() => {
                            clearSearch();
                            navigate(
                              `/w/${workspaceId}/c/${r.collection_id}/entry/${r.entry_id}`
                            );
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-900">
                              {r.collection}
                            </span>
                            <span className="text-xs text-gray-400">
                              {(r.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 line-clamp-2">
                            {r.content?.slice(0, 150) ||
                              (r.structured_data
                                ? Object.values(r.structured_data)
                                    .slice(0, 3)
                                    .join(" · ")
                                : "(no content)")}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="w-full text-center px-4 py-2 text-xs text-gray-400 hover:text-gray-600 bg-gray-50 border-t border-gray-100"
                  >
                    Close
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {workspaceId && (
              <Link
                to={`/w/${workspaceId}/settings`}
                className={`inline-flex items-center gap-1.5 text-sm transition-colors ${location.pathname.includes("/settings") ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                title="Manage data sources, agent keys, members, audit log, and workspace deletion"
              >
                <svg
                  className="w-3.5 h-3.5"
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
            )}
            <a
              href="https://github.com/stritefax2/prismian#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700 hidden sm:inline"
              title="Docs & code examples on GitHub"
            >
              Help
            </a>
            <span className="text-xs text-gray-400 hidden sm:block">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

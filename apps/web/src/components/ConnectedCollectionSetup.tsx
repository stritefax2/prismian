import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";

interface DataSourceTable {
  schema: string;
  name: string;
  columns: Array<{
    name: string;
    data_type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
  }>;
}

interface Collection {
  id: string;
  name: string;
  source_id: string | null;
}

// Data types that are reasonable as an embedding "content" column.
const TEXT_LIKE_TYPES = new Set([
  "text",
  "character varying",
  "varchar",
  "character",
  "bpchar",
]);

export function ConnectedCollectionSetup({
  workspaceId,
  dataSourceId,
  dataSourceName,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  dataSourceId: string;
  dataSourceName: string;
  onClose: () => void;
  onCreated: (collection: Collection) => void;
}) {
  const [tables, setTables] = useState<DataSourceTable[] | null>(null);
  const [introspectError, setIntrospectError] = useState("");
  const [selectedTable, setSelectedTable] = useState<DataSourceTable | null>(
    null
  );
  const [collectionName, setCollectionName] = useState("");
  const [primaryKey, setPrimaryKey] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [contentCol, setContentCol] = useState<string>("");
  const [mode, setMode] = useState<"live" | "mirror">("live");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    apiFetch<{ tables: DataSourceTable[] }>(
      `/api/v1/data-sources/${dataSourceId}/introspect`,
      { method: "POST" }
    )
      .then((data) => setTables(data.tables))
      .catch((e) => setIntrospectError(e.message));
  }, [dataSourceId]);

  function pickTable(t: DataSourceTable) {
    setSelectedTable(t);
    setCollectionName(t.name);
    // Default the row-id column. Preference order:
    //   1. The declared PRIMARY KEY (if any)
    //   2. A non-nullable column literally named `id` (extremely common)
    //   3. The first non-nullable column
    //   4. As a last resort, the first column (user will need to acknowledge
    //      this is risky if rows have nulls in this field)
    const pk = t.columns.find((c) => c.is_primary_key);
    const idCol = t.columns.find(
      (c) => c.name.toLowerCase() === "id" && !c.is_nullable
    );
    const firstNonNullable = t.columns.find((c) => !c.is_nullable);
    const candidate =
      pk?.name ||
      idCol?.name ||
      firstNonNullable?.name ||
      t.columns[0]?.name ||
      "";
    setPrimaryKey(candidate);
    setSelectedCols(new Set(t.columns.map((c) => c.name)));
    setContentCol("");
  }

  function toggleCol(name: string) {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleCreate() {
    if (!selectedTable || !primaryKey || selectedCols.size === 0) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const qualifiedTable =
        selectedTable.schema === "public"
          ? selectedTable.name
          : `${selectedTable.schema}.${selectedTable.name}`;

      const data = await apiFetch<{ collection: Collection }>(
        "/api/v1/collections",
        {
          method: "POST",
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: collectionName,
            collection_type: "structured",
            source_id: dataSourceId,
            source_mode: mode,
            source_config: {
              table: qualifiedTable,
              primary_key: primaryKey,
              columns: Array.from(selectedCols),
              content_column: contentCol || undefined,
            },
          }),
        }
      );
      onCreated(data.collection);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create connected collection");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">
              Add connected collection
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              from {dataSourceName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {introspectError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              Couldn't read schema: {introspectError}
            </div>
          )}

          {!tables && !introspectError && (
            <div className="py-12 text-center text-sm text-gray-400 animate-pulse">
              Reading schema from database...
            </div>
          )}

          {/* Step 1: pick a table */}
          {tables && !selectedTable && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-3">
                Pick a table
              </h3>
              {tables.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tables found in this database.
                </p>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                  {tables.map((t) => {
                    const qualified = `${t.schema}.${t.name}`;
                    const pk = t.columns.find((c) => c.is_primary_key);
                    const hasNonNullCol = t.columns.some(
                      (c) => !c.is_nullable
                    );
                    return (
                      <button
                        key={qualified}
                        onClick={() => pickTable(t)}
                        className="w-full flex items-center justify-between text-left px-4 py-3 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                      >
                        <div className="min-w-0">
                          <code className="text-sm font-mono text-gray-900">
                            {qualified}
                          </code>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t.columns.length} columns
                            {pk ? (
                              <>
                                {" · "}
                                <span className="text-emerald-700">
                                  PK detected:{" "}
                                  <code className="font-mono">{pk.name}</code>
                                </span>
                              </>
                            ) : hasNonNullCol ? (
                              <>
                                {" · "}
                                <span className="text-gray-500">
                                  no PK — you'll pick a row identifier
                                </span>
                              </>
                            ) : (
                              <>
                                {" · "}
                                <span className="text-amber-700">
                                  all columns nullable — sync may fail on
                                  rows with no row-id value
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-gray-900 font-medium shrink-0 ml-3">
                          Select →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: configure columns */}
          {selectedTable && (
            <div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-xs text-gray-500 hover:text-gray-700 mb-4"
              >
                ← Pick a different table
              </button>

              <label className="block mb-4">
                <span className="text-sm font-medium text-gray-700">
                  Collection name
                </span>
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                />
              </label>

              <label className="block mb-4">
                <span className="text-sm font-medium text-gray-700">
                  Row identifier column
                </span>
                <select
                  value={primaryKey}
                  onChange={(e) => setPrimaryKey(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                >
                  {selectedTable.columns.map((c) => {
                    const tags: string[] = [];
                    if (c.is_primary_key) tags.push("PK");
                    if (c.is_nullable) tags.push("nullable");
                    const tagSuffix = tags.length ? ` — ${tags.join(", ")}` : "";
                    return (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type}){tagSuffix}
                      </option>
                    );
                  })}
                </select>
                <span className="block mt-1 text-xs text-gray-500 leading-relaxed">
                  Used to track rows across syncs and deduplicate. Pick a
                  column that's unique and ideally non-nullable. If a row
                  has a null in this field, sync will skip it.
                </span>
                {(() => {
                  const col = selectedTable.columns.find(
                    (c) => c.name === primaryKey
                  );
                  if (!col) return null;
                  if (col.is_nullable) {
                    return (
                      <span className="mt-2 inline-flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md leading-relaxed">
                        <span className="text-amber-600 mt-0.5 shrink-0">
                          ⚠
                        </span>
                        <span>
                          <code className="font-mono">{col.name}</code> is
                          nullable. Rows where this column is{" "}
                          <code className="font-mono">NULL</code> will fail
                          to sync.
                        </span>
                      </span>
                    );
                  }
                  return null;
                })()}
              </label>

              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 block mb-2">
                  Query mode
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("live")}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                      mode === "live"
                        ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      Live
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                        recommended
                      </span>
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Queries run against your database at request time.
                      Always current; no rows stored in Prismian.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("mirror")}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                      mode === "mirror"
                        ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900">
                      Mirror
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Rows sync into Prismian every 15 min. Enables semantic
                      search; data is up to 15 min stale.
                    </span>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Columns to expose ({selectedCols.size} of{" "}
                    {selectedTable.columns.length})
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCols(
                          new Set(selectedTable.columns.map((c) => c.name))
                        )
                      }
                      className="text-gray-900 hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCols(new Set([primaryKey]))}
                      className="text-gray-500 hover:underline"
                    >
                      Only PK
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {selectedTable.columns.map((col) => (
                    <label
                      key={col.name}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCols.has(col.name)}
                        onChange={() => toggleCol(col.name)}
                        disabled={col.name === primaryKey}
                        className="rounded"
                      />
                      <code className="text-xs font-mono text-gray-800 flex-1">
                        {col.name}
                      </code>
                      <span className="text-xs text-gray-400">
                        {col.data_type}
                      </span>
                      {col.name === primaryKey && (
                        <span className="text-[10px] bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded-full">
                          PK
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <label className="block mb-4">
                <span className="text-sm font-medium text-gray-700">
                  {mode === "mirror"
                    ? "Content column for embeddings "
                    : "Content column "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </span>
                <select
                  value={contentCol}
                  onChange={(e) => setContentCol(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                >
                  <option value="">None — structured data only</option>
                  {selectedTable.columns
                    .filter(
                      (c) =>
                        selectedCols.has(c.name) &&
                        TEXT_LIKE_TYPES.has(c.data_type)
                    )
                    .map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.data_type})
                      </option>
                    ))}
                </select>
                <span className="block mt-1 text-xs text-gray-500">
                  {mode === "mirror"
                    ? "If you pick one, semantic search queries will embed and search this column's text."
                    : "Shown as the row's main text in results. Semantic (embedding) search isn't available in live mode — keyword and structured queries are."}
                </span>
              </label>

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={
                    submitting ||
                    !collectionName.trim() ||
                    !primaryKey ||
                    selectedCols.size === 0
                  }
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {submitting
                    ? "Creating..."
                    : mode === "live"
                      ? "Create"
                      : "Create & sync"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

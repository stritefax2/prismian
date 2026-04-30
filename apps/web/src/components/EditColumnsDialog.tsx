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

interface CollectionResponse {
  id: string;
  name: string;
  collection_type: string;
  schema: Record<string, unknown> | null;
  workspace_id: string;
  source_id: string | null;
  source_config: {
    table: string;
    primary_key: string;
    columns: string[];
    content_column?: string;
  } | null;
  sync_status: "idle" | "syncing" | "error" | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

const TEXT_LIKE_TYPES = new Set([
  "text",
  "character varying",
  "varchar",
  "character",
  "bpchar",
]);

export function EditColumnsDialog({
  collectionId,
  sourceId,
  currentColumns,
  currentContentColumn,
  onClose,
  onSaved,
}: {
  collectionId: string;
  sourceId: string;
  currentColumns: string[];
  currentContentColumn: string | undefined;
  onClose: () => void;
  onSaved: (updated: CollectionResponse) => void;
}) {
  const [tables, setTables] = useState<DataSourceTable[] | null>(null);
  const [introspectError, setIntrospectError] = useState("");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(currentColumns)
  );
  const [contentCol, setContentCol] = useState<string>(
    currentContentColumn || ""
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Re-introspect the source so we surface columns added since the
  // collection was created. The user might have ALTERed the table.
  useEffect(() => {
    apiFetch<{ tables: DataSourceTable[] }>(
      `/api/v1/data-sources/${sourceId}/introspect`,
      { method: "POST" }
    )
      .then((data) => setTables(data.tables))
      .catch((e) => setIntrospectError(e.message));
  }, [sourceId]);

  // We need to find the matching table for *this* collection. The
  // source_config.table value uses the qualified form (`public.foo` or
  // unqualified `foo` if schema=public). Match on either.
  const matchingTable = tables?.find((t) => {
    const qualified = `${t.schema}.${t.name}`;
    return (
      qualified === currentColumns[0]?.split(".")[0] || // legacy
      tables.length === 1 ||
      // Fall back to first table that contains all currently-selected
      // columns. Robust against minor schema prefix differences.
      currentColumns.every((c) =>
        t.columns.some((col) => col.name === c)
      )
    );
  });

  function toggleCol(name: string) {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const data = await apiFetch<{ collection: CollectionResponse }>(
        `/api/v1/collections/${collectionId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            columns: Array.from(selectedCols),
            content_column: contentCol || null,
          }),
        }
      );
      onSaved(data.collection);
    } catch (err: any) {
      setSaveError(err.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-2xl shadow-gray-900/10 max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-gray-900">
              Edit exposed columns
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {introspectError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              Couldn't read schema: {introspectError}
            </div>
          )}

          {!tables && !introspectError && (
            <div className="py-6 text-center text-sm text-gray-400 animate-pulse">
              Re-reading schema from source database…
            </div>
          )}

          {matchingTable && (
            <>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Toggle which columns are mirrored into Prismian. The primary
                key is always included. Changes save and re-sync immediately.
              </p>

              <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-72 overflow-y-auto mb-4">
                {matchingTable.columns.map((col) => {
                  const isPk = col.is_primary_key;
                  const isSelected = selectedCols.has(col.name) || isPk;
                  return (
                    <label
                      key={col.name}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isPk}
                        onChange={() => toggleCol(col.name)}
                        className="rounded"
                      />
                      <code className="text-xs font-mono text-gray-800 flex-1 truncate">
                        {col.name}
                      </code>
                      <span className="text-xs text-gray-400 shrink-0">
                        {col.data_type}
                      </span>
                      {isPk && (
                        <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                          PK
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              <label className="block mb-4">
                <span className="text-xs font-medium text-gray-700">
                  Content column for embeddings{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </span>
                <select
                  value={contentCol}
                  onChange={(e) => setContentCol(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                >
                  <option value="">None — structured data only</option>
                  {matchingTable.columns
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
              </label>

              {saveError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {saveError}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !matchingTable || selectedCols.size === 0}
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving & re-syncing…" : "Save & re-sync"}
          </button>
        </div>
      </div>
    </div>
  );
}

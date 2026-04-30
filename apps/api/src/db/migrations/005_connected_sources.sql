-- Connected data sources: external databases Prismian mirrors read-only
-- Agents never write to these. Connected collections reject all writes at API layer.

CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('postgres')),
  -- AES-GCM encrypted connection config (e.g. connection string) using CONNECTOR_ENCRYPTION_KEY.
  -- Never returned to the client in plaintext.
  encrypted_config TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_data_sources_workspace ON data_sources (workspace_id);

-- Connected collections: reference a data_source + carry enough config to
-- reproduce a sync. source_config shape:
-- {
--   "table": "public.customers",
--   "primary_key": "id",
--   "columns": ["id", "email", "status", "mrr", "created_at"],
--   "content_column": "notes"  -- optional, used for embeddings
-- }
ALTER TABLE collections
  ADD COLUMN source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  ADD COLUMN source_config JSONB,
  ADD COLUMN sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'error')),
  ADD COLUMN last_sync_at TIMESTAMPTZ,
  ADD COLUMN last_sync_error TEXT;

CREATE INDEX idx_collections_source ON collections (source_id)
  WHERE source_id IS NOT NULL;

-- Entries synced from a data source carry the source's row identifier so
-- re-syncs upsert cleanly. Values are TEXT to support composite/string PKs.
ALTER TABLE entries
  ADD COLUMN source_row_id TEXT;

CREATE UNIQUE INDEX idx_entries_source_row
  ON entries (collection_id, source_row_id)
  WHERE source_row_id IS NOT NULL;

-- RLS: data_sources visible to workspace members; only owners/editors may create/delete.
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_sources_select ON data_sources FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  ));

CREATE POLICY data_sources_insert ON data_sources FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      AND role IN ('owner', 'editor')
  ));

CREATE POLICY data_sources_update ON data_sources FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      AND role IN ('owner', 'editor')
  ));

CREATE POLICY data_sources_delete ON data_sources FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      AND role = 'owner'
  ));

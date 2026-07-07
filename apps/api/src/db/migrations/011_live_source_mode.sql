-- Live query mode for connected collections.
--
-- mirror (default): rows are synced into our entries table every 15 min —
--   the original model. Enables semantic/keyword search over a local copy,
--   works when the source is unreachable, costs staleness + data at rest.
-- live: agent queries are translated to SELECTs and executed against the
--   source database at request time. Nothing from the source is stored in
--   Prismian — only schema config, credentials (encrypted), and audit logs.
--
-- NULL for native (non-connected) collections. Existing connected
-- collections keep 'mirror' so nothing changes behavior on deploy.

ALTER TABLE collections
  ADD COLUMN source_mode TEXT CHECK (source_mode IN ('mirror', 'live'));

UPDATE collections SET source_mode = 'mirror' WHERE source_id IS NOT NULL;

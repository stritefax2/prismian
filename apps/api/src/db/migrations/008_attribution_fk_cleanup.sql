-- Make attribution-style foreign keys (created_by, changed_by,
-- created_by_agent, changed_by_agent, invited_by) survive the deletion
-- of the actor they reference. Without this, deleting a workspace
-- cascaded into agent_keys but the entry_versions FK to agent_keys had
-- no ON DELETE behavior, so the cascade aborted with:
--
--   update or delete on table "agent_keys" violates foreign key
--   constraint "entry_versions_changed_by_agent_fkey"
--
-- Pattern going forward: actor references are SET NULL on actor delete.
-- The history record stays intact; we just lose the actor attribution.
-- This matches what audit_log already does (its actor_id has no FK at
-- all by design).

-- entries.created_by → users
ALTER TABLE entries
  DROP CONSTRAINT IF EXISTS entries_created_by_fkey;
ALTER TABLE entries
  ADD CONSTRAINT entries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- entries.created_by_agent → agent_keys
ALTER TABLE entries
  DROP CONSTRAINT IF EXISTS entries_created_by_agent_fkey;
ALTER TABLE entries
  ADD CONSTRAINT entries_created_by_agent_fkey
  FOREIGN KEY (created_by_agent) REFERENCES agent_keys(id) ON DELETE SET NULL;

-- entry_versions.changed_by → users
ALTER TABLE entry_versions
  DROP CONSTRAINT IF EXISTS entry_versions_changed_by_fkey;
ALTER TABLE entry_versions
  ADD CONSTRAINT entry_versions_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;

-- entry_versions.changed_by_agent → agent_keys (the failing one)
ALTER TABLE entry_versions
  DROP CONSTRAINT IF EXISTS entry_versions_changed_by_agent_fkey;
ALTER TABLE entry_versions
  ADD CONSTRAINT entry_versions_changed_by_agent_fkey
  FOREIGN KEY (changed_by_agent) REFERENCES agent_keys(id) ON DELETE SET NULL;

-- collections.created_by → users
ALTER TABLE collections
  DROP CONSTRAINT IF EXISTS collections_created_by_fkey;
ALTER TABLE collections
  ADD CONSTRAINT collections_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- workspace_invites.invited_by → users
ALTER TABLE workspace_invites
  DROP CONSTRAINT IF EXISTS workspace_invites_invited_by_fkey;
ALTER TABLE workspace_invites
  ADD CONSTRAINT workspace_invites_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- data_sources.created_by → users
ALTER TABLE data_sources
  DROP CONSTRAINT IF EXISTS data_sources_created_by_fkey;
ALTER TABLE data_sources
  ADD CONSTRAINT data_sources_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

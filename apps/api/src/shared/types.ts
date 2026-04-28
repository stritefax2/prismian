export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  settings: Record<string, unknown>;
}

export type MemberRole = "owner" | "editor" | "viewer";

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  invited_at: string;
  accepted_at: string | null;
}

export type CollectionType = "structured" | "documents" | "mixed";

export type SyncStatus = "idle" | "syncing" | "error";

export interface SourceConfig {
  table: string;
  primary_key: string;
  columns: string[];
  content_column?: string;
}

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  schema: Record<string, unknown> | null;
  collection_type: CollectionType;
  created_at: string;
  source_id: string | null;
  source_config: SourceConfig | null;
  sync_status: SyncStatus | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

export type DataSourceType = "postgres";

export type DataSourceStatus = "active" | "error" | "disabled";

export interface DataSource {
  id: string;
  workspace_id: string;
  name: string;
  source_type: DataSourceType;
  status: DataSourceStatus;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataSourceTable {
  schema: string;
  name: string;
  columns: Array<{
    name: string;
    data_type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
  }>;
}

export interface Entry {
  id: string;
  collection_id: string;
  workspace_id: string;
  structured_data: Record<string, unknown> | null;
  content: string | null;
  created_by: string | null;
  created_by_agent: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  source_row_id: string | null;
}

export interface EntryVersion {
  id: string;
  entry_id: string;
  version: number;
  structured_data: Record<string, unknown> | null;
  content: string | null;
  changed_by: string | null;
  changed_by_agent: string | null;
  changed_at: string;
  change_type: "create" | "update" | "delete";
}

export interface AgentKey {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  permissions: AgentPermissions;
  last_used_at: string | null;
  created_at: string;
}

export interface AgentPermissions {
  collections:
    | "*"
    | Record<string, Array<"read" | "write" | "delete">>;
  field_restrictions?: Record<
    string,
    { deny_fields: string[] }
  >;
  write_constraints?: {
    require_review?: boolean;
    max_entries_per_hour?: number;
    can_delete?: boolean;
  };
  query_constraints?: {
    max_results_per_query?: number;
    allowed_query_types?: Array<"semantic" | "structured" | "fulltext">;
  };
}

export interface SearchResult {
  entry_id: string;
  collection: string;
  content: string | null;
  structured_data: Record<string, unknown> | null;
  relevance_score: number;
}

export interface ChangeEvent {
  type: "entry_created" | "entry_updated" | "entry_deleted";
  workspace_id: string;
  collection_id: string;
  entry_id: string;
  changed_by: { type: "user" | "agent"; id: string; name: string };
  timestamp: string;
  changes?: Array<{ field: string; old_value: unknown; new_value: unknown }>;
}

export interface CollectionSummary {
  id: string;
  name: string;
  collection_type: CollectionType;
  entry_count: number;
  source_id: string | null;
  sync_status: SyncStatus | null;
  last_sync_at: string | null;
}

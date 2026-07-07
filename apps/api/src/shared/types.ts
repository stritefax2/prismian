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

// mirror: rows synced into Prismian every 15 min (searchable copy at rest).
// live: queries hit the source database at request time; no rows stored.
// null: native collection (not connected to a source).
export type SourceMode = "mirror" | "live";

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  schema: Record<string, unknown> | null;
  collection_type: CollectionType;
  created_at: string;
  source_id: string | null;
  source_config: SourceConfig | null;
  source_mode: SourceMode | null;
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
  // Relayed MCP tool access. Keyed by connector slug; value is "*" (all
  // tools on that connector) or an explicit tool-name allowlist.
  // Absent field falls back to: "*" when collections === "*" (full-access
  // keys stay full-access), deny otherwise (scoped keys need explicit grants).
  mcp?: "*" | Record<string, "*" | string[]>;
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

// ── MCP relay ────────────────────────────────────────────────────────────
// An MCP connector is an upstream MCP server (Linear, Sentry, Notion, ...)
// the workspace admin registered once. Prismian holds the credential,
// relays tool calls, enforces per-key tool allowlists, and audits every call.

export type McpConnectorStatus = "active" | "error" | "disabled";

export interface McpConnector {
  id: string;
  workspace_id: string;
  // URL-safe identifier used to namespace tools (e.g. "linear" →
  // "linear_search_issues"). Unique per workspace.
  slug: string;
  name: string;
  url: string;
  status: McpConnectorStatus;
  last_error: string | null;
  // Cached tool manifest from the last successful connect/refresh.
  tools: McpToolDescriptor[] | null;
  tools_refreshed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface McpToolDescriptor {
  // Original tool name on the upstream server.
  name: string;
  description: string | null;
  // JSON Schema for the tool input, passed through verbatim.
  input_schema: Record<string, unknown>;
}

// What an agent key sees: the namespaced tool list it may call.
export interface McpToolManifestEntry {
  // Namespaced name exposed to MCP clients: `${slug}_${name}`.
  namespaced_name: string;
  connector_id: string;
  connector_slug: string;
  connector_name: string;
  name: string;
  description: string | null;
  input_schema: Record<string, unknown>;
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

const API_URL = process.env.PRISMIAN_API_URL || "http://localhost:3001";
const API_KEY = process.env.PRISMIAN_API_KEY || "";
const WORKSPACE_ID = process.env.PRISMIAN_WORKSPACE || "";

export function validateConfig(): void {
  const errors: string[] = [];

  if (!API_KEY) {
    errors.push(
      "PRISMIAN_API_KEY is not set. Generate one at: Your Workspace → Settings → Agent Keys"
    );
  }
  if (!WORKSPACE_ID) {
    errors.push(
      "PRISMIAN_WORKSPACE is not set. Find your workspace ID in the URL: /w/<workspace-id>"
    );
  }

  if (errors.length > 0) {
    console.error("\n╔══════════════════════════════════════════════╗");
    console.error("║         Prismian MCP — Configuration Error     ║");
    console.error("╚══════════════════════════════════════════════╝\n");
    for (const err of errors) {
      console.error(`  ✗ ${err}\n`);
    }
    console.error("Required environment variables:");
    console.error("  PRISMIAN_API_KEY     — Agent API key (starts with pr_sk_)");
    console.error("  PRISMIAN_WORKSPACE   — Workspace UUID");
    console.error("  PRISMIAN_API_URL     — API base URL (optional, defaults to http://localhost:3001)\n");
    console.error("Example MCP config:\n");
    console.error(`  {
    "mcpServers": {
      "prismian": {
        "command": "npx",
        "args": ["-y", "prismian-mcp"],
        "env": {
          "PRISMIAN_API_KEY": "pr_sk_...",
          "PRISMIAN_WORKSPACE": "your-workspace-id",
          "PRISMIAN_API_URL": "https://your-api.vercel.app"
        }
      }
    }
  }\n`);
    process.exit(1);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new Error(
      `Cannot reach Prismian API at ${API_URL}. Is the server running? (${e.message})`
    );
  }

  if (!res.ok) {
    const error = await res.text();
    if (res.status === 401) {
      throw new Error(
        "Invalid API key. Check PRISMIAN_API_KEY or generate a new one at Settings → Agent Keys."
      );
    }
    if (res.status === 403) {
      throw new Error(
        `Permission denied: ${error}. This agent key may not have access to this resource.`
      );
    }
    throw new Error(`API error ${res.status}: ${error}`);
  }

  return res.json() as Promise<T>;
}

export function getWorkspaceId(): string {
  return WORKSPACE_ID;
}

export type SearchDiagnostic = {
  collections_searched: number;
  collections_with_text_content: number;
  total_entries_in_scope: number;
  pending_embeddings: number;
  semantic_search_active: boolean;
  collections: Array<{
    id: string;
    name: string;
    synced: boolean;
    writable: boolean;
    content_column: string | null;
    queryable_fields: string[];
    searchable_by_text: boolean;
    entry_count: number;
    pending_embeddings: number;
  }>;
  suggestion: string;
};

export const api = {
  search(
    query: string,
    options?: {
      collection?: string;
      limit?: number;
      filters?: Record<string, unknown>;
    }
  ) {
    return request<{
      results: unknown[];
      diagnostic?: SearchDiagnostic;
    }>("POST", "/api/v1/search", {
      query,
      workspace_id: getWorkspaceId(),
      ...options,
    });
  },

  readEntry(entryId: string) {
    return request<{ entry: unknown }>("GET", `/api/v1/entries/${entryId}`);
  },

  writeEntry(data: {
    collection_id: string;
    content?: string;
    structured_data?: Record<string, unknown>;
  }) {
    return request<{ entry: unknown }>("POST", "/api/v1/entries", data);
  },

  updateEntry(
    entryId: string,
    data: {
      structured_data?: Record<string, unknown>;
      content?: string;
      version: number;
    }
  ) {
    return request<{ entry: unknown }>(
      "PUT",
      `/api/v1/entries/${entryId}`,
      data
    );
  },

  deleteEntry(entryId: string) {
    return request<{ message: string }>(
      "DELETE",
      `/api/v1/entries/${entryId}`
    );
  },

  listCollections() {
    return request<{
      collections: Array<{
        id: string;
        name: string;
        collection_type: string;
        entry_count: number;
        source_id: string | null;
        source_config: {
          table: string;
          primary_key: string;
          columns: string[];
          content_column?: string;
        } | null;
        sync_status: string | null;
        last_sync_at: string | null;
      }>;
    }>(
      "GET",
      `/api/v1/collections?workspace_id=${getWorkspaceId()}`
    );
  },

  queryStructured(data: {
    collection: string;
    filters: Array<{ field: string; op: string; value: unknown }>;
    sort_by?: string;
    limit?: number;
  }) {
    return request<{ results: unknown[]; total: number }>(
      "POST",
      "/api/v1/search/structured",
      data
    );
  },

  aggregate(data: {
    collection: string;
    group_by?: string[];
    aggregations: Array<{
      op: "count" | "sum" | "avg" | "min" | "max";
      field?: string;
      alias?: string;
    }>;
    filters?: Array<{ field: string; op: string; value: unknown }>;
    having?: Array<{
      alias: string;
      op: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
      value: number;
    }>;
    order_by?: { alias: string; direction: "asc" | "desc" };
    limit?: number;
  }) {
    return request<{ results: unknown[] }>(
      "POST",
      "/api/v1/search/aggregate",
      data
    );
  },

  storeDocument(data: {
    collection_id: string;
    title: string;
    content: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }) {
    return request<{
      entry_id: string;
      title: string;
      content_length: number;
    }>("POST", "/api/v1/documents/store", data);
  },

  workspaceInfo() {
    return request<{ workspace: unknown }>(
      "GET",
      `/api/v1/workspaces/${getWorkspaceId()}`
    );
  },
};

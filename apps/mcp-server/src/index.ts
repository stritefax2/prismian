#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { api, getWorkspaceId, validateConfig } from "./client.js";

validateConfig();

const server = new McpServer({
  name: "prismian",
  version: "0.1.0",
  description:
    "Prismian — safe, audited access layer for your team's data. Query synced database tables (customers, orders, etc.) and team-written documents (decisions, meeting notes). Two categories of collection exist: synced (read-only mirrors of an external database, best queried with query_structured) and native (writable, best queried with search for text, or query_structured for typed fields). Always call list_collections first — the response tells you exactly which tool to use for each collection.",
});

server.tool(
  "search",
  `Keyword search across both content prose AND structured field values. Returns several top-ranked matches, not a single answer — review the list before deciding.

HOW IT MATCHES:
- Tokenizes the query and matches entries that contain ANY of the words (OR semantics)
- Searches both 'content' (long text) and 'structured_data' (JSON field values)
- Results are ranked by ts_rank: entries matching more terms rank higher, so a 5-word query naturally surfaces full matches first and partial matches after

WHEN TO USE:
- Fuzzy natural-language question across the workspace
- You don't yet know which collection holds the answer
- You want a shortlist of candidates to skim

WHEN query_structured IS BETTER:
- You have an exact filter (status = 'at_risk', mrr > 1000)
- You want every row matching a known field value
- You need sort/pagination/aggregation

If search returns zero results, the response includes a 'diagnostic' object listing the collections in this workspace and suggesting the next tool. Read it before reporting "nothing found" — the data may exist but require query_structured, or use simpler keywords.

Example queries:
- "Q3 pricing decision"
- "Google earnings" (matches entries storing "Google" in content OR in structured fields like {company: "Google"})
- "standup action items"`,
  {
    query: z.string().describe("Keywords to search. Multiple words are OR-matched and ranked by total match strength."),
    collection: z.string().optional().describe("Optional collection ID to scope the search. Get IDs from list_collections."),
    limit: z.number().optional().default(20).describe("Max results (1-100, default 20)"),
  },
  async ({ query, collection, limit }) => {
    const { results, diagnostic } = await api.search(query, { collection, limit });

    // Zero results aren't an answer — they're a routing decision. Return the
    // diagnostic alongside the empty array so the LLM can pick the right
    // follow-up tool in the next turn instead of telling the user nothing exists.
    if (results.length === 0 && diagnostic) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                results: [],
                diagnostic,
                next_step: diagnostic.suggestion,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

server.tool(
  "read_entry",
  `Read the full content of a specific entry or row by its ID. Use this after search or query_structured returns results and you want the complete record. Returns structured fields, freeform content (if any), and metadata (version, timestamps, source row ID for synced data).`,
  {
    entry_id: z.string().describe("The entry UUID — get this from search results or list_collections"),
  },
  async ({ entry_id }) => {
    const { entry } = await api.readEntry(entry_id);
    return {
      content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
    };
  }
);

server.tool(
  "write_entry",
  `Create a new entry in a NATIVE collection (Decisions, Meeting Notes, Insights, Agent Observations — anything where list_collections returns writable: true).

SYNCED COLLECTIONS ARE READ-ONLY. A write_entry call against a synced collection returns 409 read_only_source. To "update" a synced row, change it in the source database — the next sync (every 15 min, or manual) will propagate it.

USE THIS TO CAPTURE:
- Decisions made in conversation ("We're going with usage-based pricing")
- Summaries of meetings or customer calls
- Agent observations linked to synced rows ("Noticed 4 enterprise customers flagged pricing — linked: customers#c_01, c_02, c_03, c_04")
- Research findings, specs, retro notes

For document-style entries: pass content as markdown text.
For structured entries: pass structured_data as key-value pairs.
For mixed entries: pass both.

The entry is immediately visible to all team members and other agents, versioned, and audit-logged.`,
  {
    collection_id: z.string().describe("Target collection ID — use list_collections to find the right one"),
    content: z.string().optional().describe("Freeform text content (supports markdown). Use for meeting notes, decisions, specs, etc."),
    structured_data: z
      .record(z.unknown())
      .optional()
      .describe("Structured key-value fields. Use for CRM contacts, project tracking, etc. Example: {\"name\": \"Acme Corp\", \"status\": \"active\"}"),
  },
  async ({ collection_id, content, structured_data }) => {
    const { entry } = await api.writeEntry({
      collection_id,
      content,
      structured_data,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
    };
  }
);

server.tool(
  "update_entry",
  `Update an existing NATIVE entry. You MUST provide the current version number (get it from read_entry first) to prevent blind overwrites.

Only works on native collections. Entries synced from an external database are read-only — update_entry on them returns 409 read_only_source.

If another agent or user modified the entry between your read and update, the server attempts a field-level auto-merge on structured_data. If the merge detects conflicting field changes, you get a 409 with the server's current version so you can re-read and retry.`,
  {
    entry_id: z.string().describe("The entry UUID to update"),
    content: z.string().optional().describe("Updated freeform text content (replaces existing content)"),
    structured_data: z
      .record(z.unknown())
      .optional()
      .describe("Updated structured data fields (merged with existing fields)"),
    version: z.number().describe("Current version number from read_entry — required for conflict detection"),
  },
  async ({ entry_id, content, structured_data, version }) => {
    const { entry } = await api.updateEntry(entry_id, {
      content,
      structured_data,
      version,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
    };
  }
);

server.tool(
  "delete_entry",
  `Permanently delete a NATIVE entry. Only works on native collections — synced rows are read-only and can only be removed by deleting them from the source database (the next sync will propagate). Version history is preserved after deletion. Use with caution.`,
  {
    entry_id: z.string().describe("The entry UUID to delete"),
  },
  async ({ entry_id }) => {
    const result = await api.deleteEntry(entry_id);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "list_collections",
  `List every collection in the workspace with enough schema info to pick the right tool. CALL THIS FIRST in any new conversation.

Each collection is tagged with:
  • synced: true  → mirrored from an external database, read-only, query with query_structured (or search if it has a content_column)
  • synced: false → native, writable, query with search (text) or query_structured (fields), write with write_entry
  • queryable_fields: the column names you can filter on via query_structured
  • content_column: the text column indexed for semantic search (may be absent — in that case search returns nothing from this collection)
  • writable: whether write_entry / update_entry / delete_entry will succeed
  • source: the underlying table (e.g. "public.customers") if synced`,
  {},
  async () => {
    const { collections } = await api.listCollections();
    // Transform raw DB rows into an agent-friendly shape that makes tool
    // routing obvious. The fields below are what actually matter to an
    // LLM deciding between search and query_structured.
    const enriched = collections.map((c) => {
      const synced = Boolean(c.source_id);
      const cols = c.source_config?.columns || [];
      const contentCol = c.source_config?.content_column;
      const searchable = Boolean(
        contentCol || !synced // native collections can have content; synced only if content_column
      );
      return {
        id: c.id,
        name: c.name,
        type: c.collection_type,
        synced,
        writable: !synced,
        source: synced ? c.source_config?.table ?? null : null,
        queryable_fields: cols,
        primary_key: synced ? c.source_config?.primary_key ?? null : null,
        content_column: contentCol ?? null,
        searchable_by_text: searchable,
        entry_count: c.entry_count,
        ...(synced
          ? {
              last_sync_at: c.last_sync_at,
              sync_status: c.sync_status,
            }
          : {}),
        recommended_tools:
          synced && cols.length > 0
            ? contentCol
              ? [
                  "query_structured (field filters)",
                  "aggregate (count/sum/avg/group_by)",
                  "search (prose in content_column)",
                ]
              : [
                  "query_structured (field filters)",
                  "aggregate (count/sum/avg/group_by)",
                ]
            : !synced
              ? [
                  "search (text)",
                  "query_structured (typed fields)",
                  "aggregate (if there are numeric fields)",
                  "write_entry (create new entries)",
                ]
              : ["query_structured"],
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }],
    };
  }
);

server.tool(
  "query_structured",
  `Primary tool for querying tables — synced or native — by exact field values. Think of this as a SQL WHERE clause expressed as JSON. Prefer this over search whenever you have specific filter criteria.

Supported operators: eq, neq, gt, gte, lt, lte, contains, in

TYPICAL USES:
- Synced customers/orders/products tables from Postgres: "active enterprise customers", "orders above $10k from last month"
- Filtered native collections: "decisions tagged pricing", "meeting notes from Q3"

WORKFLOW:
1. list_collections (once per conversation) — returns queryable_fields for each collection
2. query_structured with the collection ID and filters on those fields
3. read_entry for any row you need full details on

EXAMPLE — find at-risk enterprise customers:
  collection: "<customers-collection-id>"
  filters: [
    {"field": "plan", "op": "eq", "value": "enterprise"},
    {"field": "status", "op": "eq", "value": "at_risk"}
  ]
  sort_by: "mrr"

If the target collection is synced (see list_collections → synced: true), the underlying data came from an external database on the most recent sync; use read_entry to get per-row details including its source_row_id.`,
  {
    collection: z.string().describe("Collection ID to query"),
    filters: z
      .array(
        z.object({
          field: z.string().describe("Field name in structured_data"),
          op: z
            .enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"])
            .describe("Comparison operator"),
          value: z.unknown().describe("Value to compare against"),
        })
      )
      .describe("Array of filter conditions (all must match)"),
    sort_by: z.string().optional().describe("Field name to sort results by"),
    limit: z.number().optional().default(20).describe("Max results (default 20)"),
  },
  async ({ collection, filters, sort_by, limit }) => {
    const result = await api.queryStructured({
      collection,
      filters: filters.map((f) => ({ ...f, value: f.value ?? null })),
      sort_by,
      limit,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "store_document",
  `Store a long document (spec, report, transcript, filing, etc.) into a NATIVE collection. The document lands as a single entry but is automatically chunked for section-level semantic search — a 200-page document still lets search match the one paragraph you need.

USE THIS (not write_entry) WHEN:
- Content is longer than ~1 page
- It's a complete document worth searching later

DO NOT USE ON SYNCED COLLECTIONS — they're read-only. Writes return 409.

Typical flow when a user shares a PDF/file:
1. Read the file contents yourself (you have file access)
2. list_collections to find the target native collection (e.g. "Specs", "Reports")
3. store_document with the full text, a descriptive title, and any metadata`,
  {
    collection_id: z.string().describe("Target collection ID — use list_collections to find it"),
    title: z.string().describe("Document title (e.g. 'Apple 10-K FY2024', 'Q2 Product Spec')"),
    content: z.string().describe("Full document text. Stored as one entry, automatically indexed for section-level search."),
    source: z.string().optional().describe("Where the document came from (e.g. file path, URL)"),
    metadata: z.record(z.unknown()).optional().describe("Additional structured metadata (e.g. {\"company\": \"Apple\", \"year\": \"2024\"})"),
  },
  async ({ collection_id, title, content, source, metadata }) => {
    const result = await api.storeDocument({
      collection_id,
      title,
      content,
      source,
      metadata,
    });
    return {
      content: [
        {
          type: "text",
          text: `Document "${result.title}" stored as entry ${result.entry_id}.\n` +
            `Content length: ${result.content_length} characters.\n` +
            `The document is now searchable — use the search tool to find specific sections.`,
        },
      ],
    };
  }
);

server.tool(
  "aggregate",
  `Run a structured aggregation over a collection — COUNT, SUM, AVG, MIN, MAX, with optional GROUP BY, WHERE, HAVING, and ORDER BY. This is the right tool for "how many", "what's the total", "average per category" questions. It's deliberately NOT raw SQL: fields you reference are validated, write operations are impossible, and any field redacted for your agent key will cause a loud 403 instead of a silent leak.

WHEN TO USE (prefer this over query_structured for):
- "Total MRR by plan" → group_by: ["plan"], aggregations: [{op: "sum", field: "mrr"}]
- "Count of customers by status" → group_by: ["status"], aggregations: [{op: "count"}]
- "Average deal size for active enterprise customers" → filters + single avg aggregation
- "Top 5 plans by customer count" → group_by + count + order_by + limit

PARAMETERS:
  collection (required): the collection ID
  aggregations (required, 1-10): array of {op, field?, alias?}
    • op: "count" | "sum" | "avg" | "min" | "max"
    • field: column name from queryable_fields (required except for bare count)
    • alias: optional output name; defaults to "\${op}_\${field}" or "count"
  group_by (optional, max 5 fields): column names to group by
  filters (optional, max 20): same shape as query_structured — eq/neq/gt/gte/lt/lte/contains/in
  having (optional, max 5): post-aggregate numeric filters on aliases
  order_by (optional): { alias, direction: "asc" | "desc" }
  limit (optional, max 500, default 100)

EXAMPLE — total MRR and customer count by plan, biggest plans first:
  collection: "<customers-collection-id>"
  group_by: ["plan"]
  aggregations: [
    {op: "count", alias: "customers"},
    {op: "sum", field: "mrr", alias: "total_mrr"}
  ]
  order_by: {alias: "total_mrr", direction: "desc"}

Returns one row per group (or one summary row if no group_by).`,
  {
    collection: z.string().describe("Collection ID"),
    group_by: z
      .array(z.string())
      .optional()
      .describe("Optional GROUP BY columns (from queryable_fields)"),
    aggregations: z
      .array(
        z.object({
          op: z.enum(["count", "sum", "avg", "min", "max"]),
          field: z.string().optional(),
          alias: z.string().optional(),
        })
      )
      .describe("1-10 aggregate expressions"),
    filters: z
      .array(
        z.object({
          field: z.string(),
          op: z.enum([
            "eq",
            "neq",
            "gt",
            "gte",
            "lt",
            "lte",
            "contains",
            "in",
          ]),
          value: z.unknown(),
        })
      )
      .optional()
      .describe("WHERE clause filters, same shape as query_structured"),
    having: z
      .array(
        z.object({
          alias: z.string(),
          op: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
          value: z.number(),
        })
      )
      .optional()
      .describe("Filter on aggregate aliases after grouping"),
    order_by: z
      .object({
        alias: z.string(),
        direction: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
    limit: z.number().int().min(1).max(500).optional().default(100),
  },
  async (args) => {
    const { aggregations, filters, having, order_by, ...rest } = args;
    const normalizedFilters = filters?.map((f) => ({
      ...f,
      value: f.value ?? null,
    }));
    const result = await api.aggregate({
      ...rest,
      aggregations,
      filters: normalizedFilters,
      having,
      order_by,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "workspace_info",
  `Get a one-shot overview of the workspace — its name + every collection with schema, synced/writable flags, sync freshness, and recommended tools. Equivalent to workspace metadata + list_collections in a single call. Good for orienting yourself at the start of a conversation.`,
  {},
  async () => {
    const [workspace, { collections }] = await Promise.all([
      api.workspaceInfo(),
      api.listCollections(),
    ]);
    const enriched = collections.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.collection_type,
      synced: Boolean(c.source_id),
      writable: !c.source_id,
      source: c.source_id ? c.source_config?.table ?? null : null,
      queryable_fields: c.source_config?.columns ?? [],
      content_column: c.source_config?.content_column ?? null,
      entry_count: c.entry_count,
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { ...workspace, collections: enriched },
            null,
            2
          ),
        },
      ],
    };
  }
);

// MCP Prompts — these guide agent behavior around both querying and capture.
server.prompt(
  "prismian-assistant",
  "System prompt that makes the AI use the team's connected data and knowledge base",
  {},
  () => ({
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `You are connected to Prismian, the team's safe access layer for their data. Two categories of collection exist:

  1. SYNCED (read-only): mirrors of tables from an external database (Postgres, Supabase, etc.). Examples: customers, orders, products. Query with query_structured. Never try to write — writes return 409 read_only_source. To change data, the user has to update it in the source DB.

  2. NATIVE (writable): team-written entries — Decisions, Meeting Notes, Insights, Agent Observations. Query with search (for prose) or query_structured (for typed fields). Write with write_entry / update_entry / store_document.

## Start every new conversation with list_collections
This returns, per collection: synced flag, writable flag, queryable_fields, content_column, recommended_tool. Routing every subsequent tool call correctly depends on this.

## Picking the right tool

User asks about data in a SYNCED table:
  → For "how many / total / average / per-category" questions → aggregate (never pull rows into the LLM to count them by hand)
  → For "find me records matching X" → query_structured with filters on queryable_fields
  → For fuzzy text search in a content_column → search
  → Cite the specific rows you found ("4 matching customers: c_01, c_22, c_44, c_78")

User asks about decisions, notes, or anything text-shaped in a NATIVE collection:
  → search with a specific natural-language query
  → query_structured if they're asking for entries tagged with specific fields
  → Always include where the information came from ("per the decision log from March 14...")

User asks a question that combines both ("Which enterprise customers were discussed in recent meetings?"):
  → query_structured for the enterprise customers
  → search in Meeting Notes for each customer name
  → Join the two sets and summarize

## When to proactively save to a native collection

Save when the conversation produces something the team should remember:
- **Decisions**: "We're going with..." "The plan is..." "We decided..."
- **Observations linked to synced data**: "4 of our enterprise customers flagged pricing — linked: customers#c_01, c_22, c_44, c_78"
- **Summaries of calls/meetings**: action items, attendees, outcomes
- **Research findings** worth persisting

When you detect one, ask: "Want me to save this to Prismian?" Then list_collections → write_entry (short) or store_document (long).

## Safety rules
- Never attempt to write to a synced collection — it will fail and waste a turn.
- If a user asks you to modify customer data, explain you can only read it here; they need to change it in the source database.
- Respect column redactions — if a field you expect isn't in the response, your key doesn't have access to it.

## What NOT to save
- Casual chat, small talk, temporary context
- Anything the user says is private or not for the team
- Raw query results from synced collections (they'd just duplicate data that's already mirrored)`,
        },
      },
    ],
  })
);

server.prompt(
  "save-to-prismian",
  "Save the current conversation's key takeaways to the team knowledge base",
  {},
  () => ({
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Review our conversation and identify any decisions, action items, or important information worth saving to Prismian.

For each item:
1. Call list_collections to find the best collection
2. Write a clear, well-formatted entry with a descriptive title
3. Include relevant metadata (date, participants, topic)
4. Use markdown formatting

After saving, confirm what was stored and in which collection.`,
        },
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Prismian MCP server connected");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

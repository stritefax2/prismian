#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { api, getWorkspaceId } from "./client.js";
import http from "node:http";

function createServer(): McpServer {
  const server = new McpServer({
    name: "prismian",
    version: "0.1.0",
  });

  server.tool(
    "search",
    "Semantic and full-text search across workspace entries",
    {
      query: z.string().describe("Natural language search query"),
      collection: z.string().optional().describe("Filter to a specific collection ID"),
      limit: z.number().optional().default(10).describe("Max results to return"),
    },
    async ({ query, collection, limit }) => {
      const { results } = await api.search(query, { collection, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  server.tool(
    "read_entry",
    "Read a specific entry by its ID",
    { entry_id: z.string().describe("The entry UUID to read") },
    async ({ entry_id }) => {
      const { entry } = await api.readEntry(entry_id);
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }
  );

  server.tool(
    "write_entry",
    "Create a new entry in a collection",
    {
      collection_id: z.string().describe("Target collection ID"),
      content: z.string().optional().describe("Freeform text content"),
      structured_data: z.record(z.unknown()).optional().describe("Structured key-value data"),
    },
    async ({ collection_id, content, structured_data }) => {
      const { entry } = await api.writeEntry({ collection_id, content, structured_data });
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }
  );

  server.tool(
    "update_entry",
    "Update an existing entry (requires current version for optimistic locking)",
    {
      entry_id: z.string().describe("The entry UUID to update"),
      content: z.string().optional().describe("Updated freeform text content"),
      structured_data: z.record(z.unknown()).optional().describe("Updated structured data"),
      version: z.number().describe("Current version number (for conflict detection)"),
    },
    async ({ entry_id, content, structured_data, version }) => {
      const { entry } = await api.updateEntry(entry_id, { content, structured_data, version });
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    }
  );

  server.tool(
    "list_collections",
    "List all collections in the workspace",
    {},
    async () => {
      const { collections } = await api.listCollections();
      return {
        content: [{ type: "text", text: JSON.stringify(collections, null, 2) }],
      };
    }
  );

  server.tool(
    "query_structured",
    "Query structured data with filters and sorting",
    {
      collection: z.string().describe("Collection ID to query"),
      filters: z.array(
        z.object({
          field: z.string(),
          op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"]),
          value: z.unknown(),
        })
      ).describe("Array of filter conditions"),
      sort_by: z.string().optional().describe("Field name to sort by"),
      limit: z.number().optional().default(20).describe("Max results"),
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
    "workspace_info",
    "Get workspace metadata and collections overview",
    {},
    async () => {
      const [workspace, collections] = await Promise.all([
        api.workspaceInfo(),
        api.listCollections(),
      ]);
      return {
        content: [
          { type: "text", text: JSON.stringify({ ...workspace, collections }, null, 2) },
        ],
      };
    }
  );

  server.tool(
    "store_document",
    "Store a large document as one entry — auto-indexed for section-level search",
    {
      collection_id: z.string().describe("Target collection ID"),
      title: z.string().describe("Document title"),
      content: z.string().describe("Full document text"),
      source: z.string().optional().describe("Source (file path, URL)"),
      metadata: z.record(z.unknown()).optional().describe("Additional structured metadata"),
    },
    async ({ collection_id, title, content, source, metadata }) => {
      const result = await api.storeDocument({
        collection_id, title, content, source, metadata,
      });
      return {
        content: [{
          type: "text",
          text: `Document "${result.title}" stored as entry ${result.entry_id}. Now searchable.`,
        }],
      };
    }
  );

  return server;
}

const PORT = Number(process.env.PORT) || 3002;
const EXPECTED_API_KEY = process.env.PRISMIAN_API_KEY || "";

const transports = new Map<string, SSEServerTransport>();

const httpServer = http.createServer(async (req, res) => {
  // CORS headers for SSE
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "", `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Authenticate all non-health requests
  if (EXPECTED_API_KEY) {
    const auth = req.headers.authorization;
    const token = auth?.replace("Bearer ", "");
    if (!token || (token !== EXPECTED_API_KEY && !token.startsWith("pr_sk_"))) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  if (url.pathname === "/sse" && req.method === "GET") {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const server = createServer();
    await server.connect(transport);
    return;
  }

  if (url.pathname === "/messages" && req.method === "POST") {
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId || !transports.has(sessionId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid session" }));
      return;
    }

    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", async () => {
      try {
        const transport = transports.get(sessionId)!;
        await transport.handlePostMessage(req, res, body);
      } catch (e) {
        console.error("Message handling error:", e);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal error");
        }
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, () => {
  console.log(`Prismian MCP SSE server running on http://localhost:${PORT}`);
});

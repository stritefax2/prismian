# prismian-mcp

MCP server for [Prismian](https://prismian.dev) — connect Claude, Cursor, ChatGPT, or any MCP-compatible AI tool to your team's permissioned data sources, scoped, audited, and column-redacted.

## Quick Setup

### 1. Get your credentials

- **API Key**: Go to your workspace → Settings → Agent Keys → Create new key
- **Workspace ID**: Copy from the URL when viewing your workspace (`/w/<workspace-id>`)

### 2. Add to your MCP config

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "prismian": {
      "command": "npx",
      "args": ["-y", "prismian-mcp"],
      "env": {
        "PRISMIAN_API_KEY": "pr_sk_your_key_here",
        "PRISMIAN_WORKSPACE": "your-workspace-id",
        "PRISMIAN_API_URL": "https://your-api.vercel.app"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "prismian": {
      "command": "npx",
      "args": ["-y", "prismian-mcp"],
      "env": {
        "PRISMIAN_API_KEY": "pr_sk_your_key_here",
        "PRISMIAN_WORKSPACE": "your-workspace-id",
        "PRISMIAN_API_URL": "https://your-api.vercel.app"
      }
    }
  }
}
```

### 3. Start using it

Your AI tool now has access to these tools:

| Tool | What it does |
|---|---|
| `search` | Semantic + keyword search across all entries |
| `read_entry` | Read full content of a specific entry |
| `write_entry` | Create new entries (meeting notes, decisions, contacts) |
| `update_entry` | Update existing entries with conflict detection |
| `delete_entry` | Delete an entry |
| `list_collections` | See all collections in the workspace |
| `query_structured` | Filter/sort structured data (like SQL for your knowledge base) |
| `workspace_info` | Get workspace overview and collection summary |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PRISMIAN_API_KEY` | Yes | Agent API key (starts with `pr_sk_`) |
| `PRISMIAN_WORKSPACE` | Yes | Workspace UUID |
| `PRISMIAN_API_URL` | No | API base URL (default: `http://localhost:3001`) |

## SSE Transport (Remote)

For remote connections without running a local process:

```
prismian-mcp-sse
```

Or configure your MCP client to connect via SSE:

```json
{
  "mcpServers": {
    "prismian": {
      "transport": "sse",
      "url": "https://your-mcp-server.com/sse",
      "headers": {
        "Authorization": "Bearer pr_sk_your_key_here"
      }
    }
  }
}
```

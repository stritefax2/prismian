# teammem-mcp

MCP server for [TeamMem](https://teammem.dev) — connect Claude, Cursor, ChatGPT, or any MCP-compatible AI tool to your team's persistent, permissioned knowledge base.

## Quick Setup

### 1. Get your credentials

- **API Key**: Go to your workspace → Settings → Agent Keys → Create new key
- **Workspace ID**: Copy from the URL when viewing your workspace (`/w/<workspace-id>`)

### 2. Add to your MCP config

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {
        "TEAMMEM_API_KEY": "tm_sk_your_key_here",
        "TEAMMEM_WORKSPACE": "your-workspace-id",
        "TEAMMEM_API_URL": "https://your-api.vercel.app"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {
        "TEAMMEM_API_KEY": "tm_sk_your_key_here",
        "TEAMMEM_WORKSPACE": "your-workspace-id",
        "TEAMMEM_API_URL": "https://your-api.vercel.app"
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
| `TEAMMEM_API_KEY` | Yes | Agent API key (starts with `tm_sk_`) |
| `TEAMMEM_WORKSPACE` | Yes | Workspace UUID |
| `TEAMMEM_API_URL` | No | API base URL (default: `http://localhost:3001`) |

## SSE Transport (Remote)

For remote connections without running a local process:

```
teammem-mcp-sse
```

Or configure your MCP client to connect via SSE:

```json
{
  "mcpServers": {
    "teammem": {
      "transport": "sse",
      "url": "https://your-mcp-server.com/sse",
      "headers": {
        "Authorization": "Bearer tm_sk_your_key_here"
      }
    }
  }
}
```

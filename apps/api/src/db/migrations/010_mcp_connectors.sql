-- MCP relay: upstream MCP servers (Linear, Sentry, Notion, ...) registered
-- once per workspace. Prismian holds the credential, relays tool calls with
-- per-agent-key tool allowlists, and audits every call. Remote (HTTP)
-- upstreams only in v1 — stdio upstreams need process sandboxing.

CREATE TABLE mcp_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Namespaces relayed tools: "linear" -> "linear_search_issues".
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_]*$' AND length(slug) <= 40),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  -- AES-GCM encrypted JSON: { "auth_token": "...", "headers": {...} }.
  -- NULL when the upstream needs no credential. Never returned to clients.
  encrypted_auth TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  last_error TEXT,
  -- Cached tool manifest from the last successful connect/refresh:
  -- [{ "name", "description", "input_schema" }, ...]
  tools JSONB,
  tools_refreshed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE INDEX idx_mcp_connectors_workspace ON mcp_connectors (workspace_id);

-- RLS mirrors data_sources: members can see connectors (minus credentials —
-- the API never selects encrypted_auth for listing), owners/members manage.
ALTER TABLE mcp_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_connectors_select ON mcp_connectors FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  ));

CREATE POLICY mcp_connectors_insert ON mcp_connectors FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      AND role IN ('owner', 'member', 'editor')
  ));

CREATE POLICY mcp_connectors_update ON mcp_connectors FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      AND role IN ('owner', 'member', 'editor')
  ));

CREATE POLICY mcp_connectors_delete ON mcp_connectors FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      AND role = 'owner'
  ));

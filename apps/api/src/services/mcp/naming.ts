// Relayed tools are exposed to MCP clients as `${slug}_${tool}` (e.g.
// "linear_search_issues"). Both slugs and tool names may contain
// underscores, so a namespaced name can be ambiguous on its own —
// resolution checks candidate slugs against the workspace's connectors
// and each connector's cached tool manifest, preferring the longest
// matching slug.

export interface ResolvableConnector {
  slug: string;
  tools: Array<{ name: string }> | null;
}

export function namespacedToolName(slug: string, toolName: string): string {
  return `${slug}_${toolName}`;
}

export function resolveNamespacedTool<C extends ResolvableConnector>(
  namespaced: string,
  connectors: C[]
): { connector: C; toolName: string } | null {
  const candidates = connectors
    .filter((c) => namespaced.startsWith(`${c.slug}_`))
    .sort((a, b) => b.slug.length - a.slug.length);

  for (const connector of candidates) {
    const toolName = namespaced.slice(connector.slug.length + 1);
    if (toolName.length === 0) continue;
    const tools = connector.tools ?? [];
    if (tools.some((t) => t.name === toolName)) {
      return { connector, toolName };
    }
  }
  return null;
}

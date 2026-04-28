import type { AgentPermissions } from "../shared/index.js";
import { query } from "../db/client.js";

type Action = "read" | "write" | "delete";

export function canAccessCollection(
  permissions: AgentPermissions,
  collectionName: string,
  action: Action
): boolean {
  if (permissions.collections === "*") return true;

  const collectionPerms = permissions.collections[collectionName];
  if (!collectionPerms) return false;

  return collectionPerms.includes(action);
}

export function filterDeniedFields(
  permissions: AgentPermissions,
  collectionName: string,
  data: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!data) return data;
  const restrictions = permissions.field_restrictions?.[collectionName];
  if (!restrictions?.deny_fields?.length) return data;

  const filtered = { ...data };
  for (const field of restrictions.deny_fields) {
    delete filtered[field];
  }
  return filtered;
}

export function canDelete(permissions: AgentPermissions): boolean {
  return permissions.write_constraints?.can_delete !== false;
}

export function requiresReview(permissions: AgentPermissions): boolean {
  return permissions.write_constraints?.require_review === true;
}

const rateLimitCache = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  agentKeyId: string,
  permissions: AgentPermissions
): boolean {
  const maxPerHour = permissions.write_constraints?.max_entries_per_hour;
  if (!maxPerHour) return true;

  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const entry = rateLimitCache.get(agentKeyId);

  if (!entry || now - entry.windowStart > hourMs) {
    rateLimitCache.set(agentKeyId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxPerHour) return false;

  entry.count++;
  return true;
}

export function getMaxResults(permissions: AgentPermissions): number {
  return permissions.query_constraints?.max_results_per_query ?? 50;
}

export function canUseQueryType(
  permissions: AgentPermissions,
  queryType: "semantic" | "structured" | "fulltext"
): boolean {
  const allowed = permissions.query_constraints?.allowed_query_types;
  if (!allowed) return true;
  return allowed.includes(queryType);
}

export async function getCollectionNameById(
  collectionId: string
): Promise<string | null> {
  const result = await query("SELECT name FROM collections WHERE id = $1", [
    collectionId,
  ]);
  return result.rows[0]?.name ?? null;
}

export async function getAccessibleCollectionIds(
  permissions: AgentPermissions,
  workspaceId: string,
  action: Action
): Promise<string[]> {
  const collections = await query(
    "SELECT id, name FROM collections WHERE workspace_id = $1",
    [workspaceId]
  );

  return collections.rows
    .filter((c) => canAccessCollection(permissions, c.name, action))
    .map((c) => c.id);
}

import { describe, it, expect } from "vitest";
import {
  canAccessCollection,
  filterDeniedFields,
  canDelete,
  canUseQueryType,
  getMaxResults,
  canCallMcpTool,
} from "./permissions.js";
import type { AgentPermissions } from "../shared/index.js";

const fullAccess: AgentPermissions = {
  collections: "*",
};

const scopedAccess: AgentPermissions = {
  collections: {
    meetings: ["read"],
    decisions: ["read", "write"],
    crm: ["read", "write", "delete"],
  },
  field_restrictions: {
    crm: { deny_fields: ["revenue", "internal_notes"] },
  },
  write_constraints: {
    require_review: false,
    max_entries_per_hour: 100,
    can_delete: false,
  },
  query_constraints: {
    max_results_per_query: 25,
    allowed_query_types: ["semantic", "structured"],
  },
};

describe("canAccessCollection", () => {
  it("should allow everything with wildcard", () => {
    expect(canAccessCollection(fullAccess, "anything", "read")).toBe(true);
    expect(canAccessCollection(fullAccess, "anything", "write")).toBe(true);
    expect(canAccessCollection(fullAccess, "anything", "delete")).toBe(true);
  });

  it("should enforce scoped collection access", () => {
    expect(canAccessCollection(scopedAccess, "meetings", "read")).toBe(true);
    expect(canAccessCollection(scopedAccess, "meetings", "write")).toBe(false);
    expect(canAccessCollection(scopedAccess, "decisions", "write")).toBe(true);
    expect(canAccessCollection(scopedAccess, "decisions", "delete")).toBe(false);
    expect(canAccessCollection(scopedAccess, "crm", "delete")).toBe(true);
  });

  it("should deny access to unlisted collections", () => {
    expect(canAccessCollection(scopedAccess, "secrets", "read")).toBe(false);
  });
});

describe("filterDeniedFields", () => {
  it("should strip denied fields", () => {
    const data = { name: "Acme", revenue: "1M", internal_notes: "shh", status: "active" };
    const filtered = filterDeniedFields(scopedAccess, "crm", data);

    expect(filtered).toEqual({ name: "Acme", status: "active" });
  });

  it("should pass through when no restrictions", () => {
    const data = { name: "Standup", date: "2024-01-01" };
    const filtered = filterDeniedFields(scopedAccess, "meetings", data);

    expect(filtered).toEqual(data);
  });

  it("should handle null data", () => {
    expect(filterDeniedFields(scopedAccess, "crm", null)).toBeNull();
  });
});

describe("canDelete", () => {
  it("should respect write_constraints.can_delete", () => {
    expect(canDelete(scopedAccess)).toBe(false);
    expect(canDelete(fullAccess)).toBe(true);
  });
});

describe("canUseQueryType", () => {
  it("should enforce allowed query types", () => {
    expect(canUseQueryType(scopedAccess, "semantic")).toBe(true);
    expect(canUseQueryType(scopedAccess, "structured")).toBe(true);
    expect(canUseQueryType(scopedAccess, "fulltext")).toBe(false);
  });

  it("should allow all types when no constraints", () => {
    expect(canUseQueryType(fullAccess, "fulltext")).toBe(true);
  });
});

describe("getMaxResults", () => {
  it("should return configured max", () => {
    expect(getMaxResults(scopedAccess)).toBe(25);
  });

  it("should default to 50", () => {
    expect(getMaxResults(fullAccess)).toBe(50);
  });
});

describe("canCallMcpTool", () => {
  it("full-access keys with no mcp field get all relayed tools", () => {
    expect(canCallMcpTool(fullAccess, "linear", "search_issues")).toBe(true);
  });

  it("scoped keys with no mcp field are denied", () => {
    expect(canCallMcpTool(scopedAccess, "linear", "search_issues")).toBe(false);
  });

  it("mcp: '*' grants every tool on every connector", () => {
    const perms: AgentPermissions = { collections: {}, mcp: "*" };
    expect(canCallMcpTool(perms, "linear", "search_issues")).toBe(true);
    expect(canCallMcpTool(perms, "sentry", "get_event")).toBe(true);
  });

  it("per-connector '*' grants all tools on that connector only", () => {
    const perms: AgentPermissions = {
      collections: "*",
      mcp: { linear: "*" },
    };
    expect(canCallMcpTool(perms, "linear", "anything")).toBe(true);
    expect(canCallMcpTool(perms, "sentry", "get_event")).toBe(false);
  });

  it("explicit tool allowlist is enforced", () => {
    const perms: AgentPermissions = {
      collections: {},
      mcp: { linear: ["search_issues", "get_issue"] },
    };
    expect(canCallMcpTool(perms, "linear", "search_issues")).toBe(true);
    expect(canCallMcpTool(perms, "linear", "create_issue")).toBe(false);
    expect(canCallMcpTool(perms, "sentry", "search_issues")).toBe(false);
  });

  it("an explicit mcp object overrides the full-access fallback", () => {
    const perms: AgentPermissions = {
      collections: "*",
      mcp: { sentry: "*" },
    };
    // Full collections access, but MCP was explicitly narrowed to sentry.
    expect(canCallMcpTool(perms, "linear", "search_issues")).toBe(false);
    expect(canCallMcpTool(perms, "sentry", "get_event")).toBe(true);
  });
});

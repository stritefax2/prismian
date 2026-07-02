import { describe, it, expect } from "vitest";
import { namespacedToolName, resolveNamespacedTool } from "./naming.js";

const connectors = [
  {
    slug: "linear",
    tools: [{ name: "search_issues" }, { name: "get_issue" }],
  },
  {
    // Ambiguity trap: "linear_search" is also a valid slug, and
    // "linear_search_issues" could parse as either connector.
    slug: "linear_search",
    tools: [{ name: "issues" }, { name: "run" }],
  },
  {
    slug: "sentry",
    tools: null, // never refreshed — no callable tools
  },
];

describe("namespacedToolName", () => {
  it("joins slug and tool with an underscore", () => {
    expect(namespacedToolName("linear", "search_issues")).toBe(
      "linear_search_issues"
    );
  });
});

describe("resolveNamespacedTool", () => {
  it("resolves a simple namespaced name", () => {
    const resolved = resolveNamespacedTool("linear_get_issue", connectors);
    expect(resolved?.connector.slug).toBe("linear");
    expect(resolved?.toolName).toBe("get_issue");
  });

  it("prefers the longest slug when names are ambiguous", () => {
    // Both "linear" + "search_issues" and "linear_search" + "issues"
    // are structurally valid; the longest matching slug wins, and both
    // connectors actually expose the respective tool here.
    const resolved = resolveNamespacedTool("linear_search_issues", connectors);
    expect(resolved?.connector.slug).toBe("linear_search");
    expect(resolved?.toolName).toBe("issues");
  });

  it("falls back to a shorter slug when the longer one lacks the tool", () => {
    // "linear_search" has no tool named "nonexistent"... but "linear"
    // does not either — however "linear" DOES have "search_issues";
    // this case checks fallback: "linear_search_run" only matches
    // the longer slug, "linear_get_issue" only the shorter.
    const viaLonger = resolveNamespacedTool("linear_search_run", connectors);
    expect(viaLonger?.connector.slug).toBe("linear_search");

    const viaShorter = resolveNamespacedTool("linear_get_issue", connectors);
    expect(viaShorter?.connector.slug).toBe("linear");
  });

  it("returns null for unknown connectors or tools", () => {
    expect(resolveNamespacedTool("github_search", connectors)).toBeNull();
    expect(resolveNamespacedTool("linear_nope", connectors)).toBeNull();
  });

  it("returns null when the connector has no cached tools", () => {
    expect(resolveNamespacedTool("sentry_get_event", connectors)).toBeNull();
  });

  it("returns null for a bare slug with no tool part", () => {
    expect(resolveNamespacedTool("linear_", connectors)).toBeNull();
    expect(resolveNamespacedTool("linear", connectors)).toBeNull();
  });
});

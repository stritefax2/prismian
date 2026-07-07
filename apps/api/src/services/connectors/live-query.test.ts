import { describe, it, expect } from "vitest";
import {
  allowedColumnsFor,
  buildStructuredSql,
  buildAggregateSql,
  buildFullTextSql,
  buildReadRowSql,
  buildBrowseSql,
  liveEntryId,
  parseLiveEntryId,
  shapeLiveRow,
  LiveQueryError,
} from "./live-query.js";
import type { SourceConfig } from "../../shared/index.js";

const config: SourceConfig = {
  table: "public.orders",
  primary_key: "id",
  columns: ["id", "status", "amount", "customer_email", "notes"],
  content_column: "notes",
};

const COL_ID = "0b81a2f6-1111-4222-8333-444455556666";

describe("allowedColumnsFor", () => {
  it("removes denied columns", () => {
    expect(allowedColumnsFor(config, new Set(["customer_email"]))).toEqual([
      "id",
      "status",
      "amount",
      "notes",
    ]);
  });
});

describe("buildStructuredSql", () => {
  it("builds a plain select with pk ordering and limit", () => {
    const { sql, params } = buildStructuredSql(
      config,
      config.columns,
      new Set(),
      { filters: [], limit: 10 }
    );
    expect(sql).toContain('FROM "public"."orders"');
    expect(sql).toContain('ORDER BY "id"');
    expect(sql).toContain("LIMIT $1");
    expect(params).toEqual([10]);
  });

  it("projects only allowed columns", () => {
    const denied = new Set(["customer_email"]);
    const allowed = allowedColumnsFor(config, denied);
    const { sql } = buildStructuredSql(config, allowed, denied, {
      filters: [],
      limit: 5,
    });
    expect(sql).not.toContain("customer_email");
    expect(sql).toContain('"status"');
  });

  it("translates filter ops with text/numeric casts", () => {
    const { sql, params } = buildStructuredSql(
      config,
      config.columns,
      new Set(),
      {
        filters: [
          { field: "status", op: "eq", value: "paid" },
          { field: "amount", op: "gte", value: 100 },
          { field: "notes", op: "contains", value: "refund" },
          { field: "status", op: "in", value: ["paid", "pending"] },
        ],
        limit: 20,
      }
    );
    expect(sql).toContain(`"status"::text = $1`);
    expect(sql).toContain(`("amount")::numeric >= $2`);
    expect(sql).toContain(`"notes"::text ILIKE $3`);
    expect(sql).toContain(`"status"::text = ANY($4::text[])`);
    expect(params).toEqual(["paid", 100, "%refund%", ["paid", "pending"], 20]);
  });

  it("rejects filters on denied fields with 403", () => {
    const denied = new Set(["customer_email"]);
    const allowed = allowedColumnsFor(config, denied);
    try {
      buildStructuredSql(config, allowed, denied, {
        filters: [{ field: "customer_email", op: "eq", value: "x@y.z" }],
        limit: 10,
      });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LiveQueryError);
      expect((e as LiveQueryError).status).toBe(403);
    }
  });

  it("rejects filters on unknown fields with 400", () => {
    try {
      buildStructuredSql(config, config.columns, new Set(), {
        filters: [{ field: "does_not_exist", op: "eq", value: 1 }],
        limit: 10,
      });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LiveQueryError);
      expect((e as LiveQueryError).status).toBe(400);
    }
  });

  it("rejects sort on denied field", () => {
    const denied = new Set(["amount"]);
    const allowed = allowedColumnsFor(config, denied);
    expect(() =>
      buildStructuredSql(config, allowed, denied, {
        filters: [],
        sort_by: "amount",
        limit: 10,
      })
    ).toThrow(LiveQueryError);
  });

  it("quotes malicious identifiers rather than executing them", () => {
    const evil: SourceConfig = {
      table: 'orders"; DROP TABLE users; --',
      primary_key: "id",
      columns: ["id"],
    };
    const { sql } = buildStructuredSql(evil, ["id"], new Set(), {
      filters: [],
      limit: 1,
    });
    // The whole table name lands inside one quoted identifier.
    expect(sql).toContain('FROM "orders""; DROP TABLE users; --"');
  });
});

describe("buildAggregateSql", () => {
  it("builds grouped aggregates with having and order", () => {
    const { sql, params } = buildAggregateSql(
      config,
      config.columns,
      new Set(),
      {
        group_by: ["status"],
        aggregations: [
          { op: "count" },
          { op: "sum", field: "amount", alias: "total" },
        ],
        filters: [{ field: "amount", op: "gt", value: 0 }],
        having: [{ alias: "total", op: "gte", value: 100 }],
        order_by: { alias: "total", direction: "desc" },
        limit: 50,
      }
    );
    expect(sql).toContain(`"status"::text AS "status"`);
    expect(sql).toContain(`COUNT(*)::int AS "count"`);
    expect(sql).toContain(`SUM(("amount")::numeric) AS "total"`);
    expect(sql).toContain(`GROUP BY "status"`);
    expect(sql).toContain(`HAVING "total" >= $2`);
    expect(sql).toContain(`ORDER BY "total" DESC NULLS LAST`);
    expect(params).toEqual([0, 100, 50]);
  });

  it("refuses aggregation over a denied field", () => {
    const denied = new Set(["amount"]);
    const allowed = allowedColumnsFor(config, denied);
    expect(() =>
      buildAggregateSql(config, allowed, denied, {
        aggregations: [{ op: "sum", field: "amount" }],
        limit: 10,
      })
    ).toThrow(LiveQueryError);
  });

  it("refuses unknown having alias", () => {
    expect(() =>
      buildAggregateSql(config, config.columns, new Set(), {
        aggregations: [{ op: "count" }],
        having: [{ alias: "nope", op: "gt", value: 1 }],
        limit: 10,
      })
    ).toThrow(/unknown alias/);
  });
});

describe("buildFullTextSql", () => {
  it("searches across allowed columns only", () => {
    const denied = new Set(["customer_email"]);
    const allowed = allowedColumnsFor(config, denied);
    const { sql, params } = buildFullTextSql(config, allowed, {
      query: "refund pending",
      limit: 10,
    });
    expect(sql).not.toContain("customer_email");
    expect(sql).toContain("ts_rank");
    expect(params).toEqual(["refund pending", 10]);
  });
});

describe("buildReadRowSql", () => {
  it("looks up by pk as text", () => {
    const { sql, params } = buildReadRowSql(config, config.columns, "42");
    expect(sql).toContain(`WHERE "id"::text = $1`);
    expect(params).toEqual(["42"]);
  });
});

describe("buildBrowseSql", () => {
  it("builds list + count with keyword filter", () => {
    const { list, count } = buildBrowseSql(config, config.columns, new Set(), {
      q: "acme",
      limit: 50,
      offset: 100,
    });
    expect(list.sql).toContain("ILIKE $1");
    expect(list.params).toEqual(["%acme%", 50, 100]);
    expect(count.sql).toContain("COUNT(*)");
    expect(count.params).toEqual(["%acme%"]);
  });
});

describe("live entry ids", () => {
  it("round-trips", () => {
    const id = liveEntryId(COL_ID, "row-7");
    expect(parseLiveEntryId(id)).toEqual({
      collectionId: COL_ID,
      sourceRowId: "row-7",
    });
  });

  it("rejects non-live ids", () => {
    expect(parseLiveEntryId(COL_ID)).toBeNull();
    expect(parseLiveEntryId("live_notauuid_5")).toBeNull();
  });
});

describe("shapeLiveRow", () => {
  it("splits content column out and builds synthetic id", () => {
    const shaped = shapeLiveRow(
      { id: 7, status: "paid", amount: 12.5, notes: "hello" },
      { id: COL_ID, workspace_id: "ws1", source_config: config },
      ["id", "status", "amount", "notes"]
    );
    expect(shaped.id).toBe(`live_${COL_ID}_7`);
    expect(shaped.content).toBe("hello");
    expect(shaped.structured_data).toEqual({
      id: 7,
      status: "paid",
      amount: 12.5,
    });
    expect(shaped.live).toBe(true);
    expect(shaped.source_row_id).toBe("7");
  });
});

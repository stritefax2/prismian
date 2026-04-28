import { describe, it, expect } from "vitest";
import {
  sourceConfigSchema,
  createDataSourceSchema,
  createCollectionSchema,
  aggregateSchema,
} from "../../shared/index.js";

describe("sourceConfigSchema", () => {
  it("accepts a valid schema-qualified table", () => {
    const result = sourceConfigSchema.safeParse({
      table: "public.customers",
      primary_key: "id",
      columns: ["id", "email", "status"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an unqualified table", () => {
    const result = sourceConfigSchema.safeParse({
      table: "customers",
      primary_key: "id",
      columns: ["id"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects tables with SQL metacharacters", () => {
    for (const table of [
      "customers;DROP TABLE users",
      'customers"',
      "customers'",
      "customers--",
      "public.customers.extra",
      "",
    ]) {
      const result = sourceConfigSchema.safeParse({
        table,
        primary_key: "id",
        columns: ["id"],
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects columns with SQL metacharacters", () => {
    const result = sourceConfigSchema.safeParse({
      table: "customers",
      primary_key: "id",
      columns: ["id", "name; DROP"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one column", () => {
    const result = sourceConfigSchema.safeParse({
      table: "customers",
      primary_key: "id",
      columns: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional content column", () => {
    const result = sourceConfigSchema.safeParse({
      table: "customers",
      primary_key: "id",
      columns: ["id", "notes"],
      content_column: "notes",
    });
    expect(result.success).toBe(true);
  });
});

describe("createCollectionSchema", () => {
  it("allows creating a native collection without source info", () => {
    const result = createCollectionSchema.safeParse({
      name: "Decisions",
      collection_type: "documents",
    });
    expect(result.success).toBe(true);
  });

  it("allows creating a connected collection with both source_id and source_config", () => {
    const result = createCollectionSchema.safeParse({
      name: "Customers",
      collection_type: "structured",
      source_id: "00000000-0000-0000-0000-000000000000",
      source_config: {
        table: "public.customers",
        primary_key: "id",
        columns: ["id", "email"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects source_id without source_config", () => {
    const result = createCollectionSchema.safeParse({
      name: "Customers",
      collection_type: "structured",
      source_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects source_config without source_id", () => {
    const result = createCollectionSchema.safeParse({
      name: "Customers",
      collection_type: "structured",
      source_config: {
        table: "public.customers",
        primary_key: "id",
        columns: ["id"],
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("aggregateSchema", () => {
  const collectionId = "00000000-0000-0000-0000-000000000000";

  it("accepts a simple count", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: [{ op: "count" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts count + sum with group_by", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      group_by: ["plan"],
      aggregations: [
        { op: "count", alias: "n" },
        { op: "sum", field: "mrr", alias: "total_mrr" },
      ],
      order_by: { alias: "total_mrr", direction: "desc" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects sum without a field", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: [{ op: "sum" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects SQL-unsafe field names in group_by", () => {
    for (const badField of [
      "plan; DROP TABLE entries",
      "plan'",
      'plan"',
      "plan--",
      "1plan",
      "",
    ]) {
      const result = aggregateSchema.safeParse({
        collection: collectionId,
        group_by: [badField],
        aggregations: [{ op: "count" }],
      });
      expect(result.success, `should reject ${JSON.stringify(badField)}`).toBe(
        false
      );
    }
  });

  it("rejects SQL-unsafe field names in aggregation fields", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: [{ op: "sum", field: "mrr; DROP" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects SQL-unsafe field names in filters", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: [{ op: "count" }],
      filters: [{ field: "plan OR 1=1", op: "eq", value: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("caps group_by at 5 fields", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      group_by: ["a", "b", "c", "d", "e", "f"],
      aggregations: [{ op: "count" }],
    });
    expect(result.success).toBe(false);
  });

  it("caps aggregations at 10", () => {
    const result = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: Array.from({ length: 11 }, (_, i) => ({
        op: "sum" as const,
        field: `f${i}`,
      })),
    });
    expect(result.success).toBe(false);
  });

  it("limit defaults to 100 and caps at 500", () => {
    const ok = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: [{ op: "count" }],
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.limit).toBe(100);

    const over = aggregateSchema.safeParse({
      collection: collectionId,
      aggregations: [{ op: "count" }],
      limit: 1000,
    });
    expect(over.success).toBe(false);
  });
});

describe("createDataSourceSchema", () => {
  it("requires a connection string", () => {
    const result = createDataSourceSchema.safeParse({
      name: "Prod",
      source_type: "postgres",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown source types", () => {
    const result = createDataSourceSchema.safeParse({
      name: "Prod",
      source_type: "mysql",
      connection_string: "mysql://...",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid payload", () => {
    const result = createDataSourceSchema.safeParse({
      name: "Prod",
      source_type: "postgres",
      connection_string: "postgres://user:pass@host:5432/db",
    });
    expect(result.success).toBe(true);
  });
});

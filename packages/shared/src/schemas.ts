import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  settings: z.record(z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "editor", "viewer"]).default("editor"),
});

export const sourceConfigSchema = z.object({
  table: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/,
      "Must be a valid Postgres identifier, optionally schema-qualified"
    ),
  primary_key: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid column name"),
  columns: z
    .array(
      z
        .string()
        .min(1)
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid column name")
    )
    .min(1),
  content_column: z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
});

export const createCollectionSchema = z
  .object({
    name: z.string().min(1).max(100),
    collection_type: z.enum(["structured", "documents", "mixed"]),
    schema: z.record(z.unknown()).optional(),
    source_id: z.string().uuid().optional(),
    source_config: sourceConfigSchema.optional(),
  })
  .refine(
    (data) =>
      (data.source_id === undefined) === (data.source_config === undefined),
    {
      message: "source_id and source_config must be provided together",
      path: ["source_config"],
    }
  );

export const createDataSourceSchema = z.object({
  name: z.string().min(1).max(100),
  source_type: z.literal("postgres"),
  connection_string: z.string().min(1),
});

export const introspectDataSourceSchema = z.object({
  data_source_id: z.string().uuid(),
});

export const createEntrySchema = z.object({
  collection_id: z.string().uuid(),
  structured_data: z.record(z.unknown()).optional(),
  content: z.string().optional(),
});

export const updateEntrySchema = z.object({
  structured_data: z.record(z.unknown()).optional(),
  content: z.string().optional(),
  version: z.number().int().positive(),
});

export const searchSchema = z.object({
  query: z.string().min(1),
  collection: z.string().uuid().optional(),
  // Default 20 (was 10): keyword search is OR-matched, so we want to surface
  // several ranked candidates rather than a single best guess.
  limit: z.number().int().min(1).max(100).default(20),
  filters: z.record(z.unknown()).optional(),
});

export const structuredQuerySchema = z.object({
  collection: z.string().uuid(),
  filters: z.array(
    z.object({
      field: z.string(),
      op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"]),
      value: z.unknown(),
    })
  ),
  sort_by: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// Safe field name — alphanumeric + underscore, starts with letter/underscore.
// Mirrors the SAFE_FIELD_RE guard in the API routes; having it here means
// invalid field names are rejected before we even look at SQL generation.
const fieldName = z
  .string()
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "Field names must be alphanumeric + underscore, starting with a letter or underscore"
  );

// Structured aggregation — the safe alternative to raw SQL. Covers
// count/sum/avg/min/max with optional GROUP BY and numeric HAVING.
// Everything is field-name-validated so the API can safely build SQL
// without a separate parser pass.
export const aggregateSchema = z.object({
  collection: z.string().uuid(),
  // If omitted, a single aggregate row is returned covering the whole
  // filtered set. If provided, one row per distinct combination.
  group_by: z.array(fieldName).max(5).optional(),
  aggregations: z
    .array(
      z
        .object({
          op: z.enum(["count", "sum", "avg", "min", "max"]),
          // count accepts no field (counts all rows); others require one.
          field: fieldName.optional(),
          alias: fieldName.optional(),
        })
        .refine(
          (a) => a.op === "count" || typeof a.field === "string",
          "sum/avg/min/max require a field"
        )
    )
    .min(1)
    .max(10),
  filters: z
    .array(
      z.object({
        field: fieldName,
        op: z.enum([
          "eq",
          "neq",
          "gt",
          "gte",
          "lt",
          "lte",
          "contains",
          "in",
        ]),
        value: z.unknown(),
      })
    )
    .max(20)
    .optional(),
  // HAVING clause — filters on aggregate results. Reference aggregates by
  // alias or by "<op>_<field>" (e.g. "sum_mrr") if no alias was given.
  having: z
    .array(
      z.object({
        alias: fieldName,
        op: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
        value: z.number(),
      })
    )
    .max(5)
    .optional(),
  order_by: z
    .object({
      alias: fieldName,
      direction: z.enum(["asc", "desc"]).default("desc"),
    })
    .optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const createAgentKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.object({
    collections: z.union([
      z.literal("*"),
      z.record(z.array(z.enum(["read", "write", "delete"]))),
    ]),
    field_restrictions: z
      .record(z.object({ deny_fields: z.array(z.string()) }))
      .optional(),
    write_constraints: z
      .object({
        require_review: z.boolean().optional(),
        max_entries_per_hour: z.number().int().positive().optional(),
        can_delete: z.boolean().optional(),
      })
      .optional(),
    query_constraints: z
      .object({
        max_results_per_query: z.number().int().positive().optional(),
        allowed_query_types: z
          .array(z.enum(["semantic", "structured", "fulltext"]))
          .optional(),
      })
      .optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type StructuredQueryInput = z.infer<typeof structuredQuerySchema>;
export type CreateAgentKeyInput = z.infer<typeof createAgentKeySchema>;
export type SourceConfigInput = z.infer<typeof sourceConfigSchema>;
export type CreateDataSourceInput = z.infer<typeof createDataSourceSchema>;
export type AggregateInput = z.infer<typeof aggregateSchema>;

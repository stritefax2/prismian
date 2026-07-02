import { z } from "zod";

// Upstream MCP servers describe tool inputs as JSON Schema; the SDK's
// high-level McpServer wants Zod. This converts the common subset —
// enough for the LLM to see parameter names, types, enums, and
// descriptions. Anything exotic (oneOf, conditionals, $ref) degrades to
// z.any(): validation is the upstream server's job anyway, we only need
// the advertised schema to be useful for tool selection.

type JsonSchema = Record<string, unknown>;

const MAX_DEPTH = 6;

function convert(schema: JsonSchema, depth: number): z.ZodTypeAny {
  if (depth > MAX_DEPTH) return z.any();

  let result: z.ZodTypeAny;

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const values = schema.enum;
    if (values.every((v): v is string => typeof v === "string")) {
      result = z.enum(values as [string, ...string[]]);
    } else {
      result = z.union([z.string(), z.number(), z.boolean(), z.null()]);
    }
  } else {
    // `type` may be a string or an array of strings (nullable unions).
    const type = Array.isArray(schema.type)
      ? (schema.type.find((t) => t !== "null") as string | undefined)
      : (schema.type as string | undefined);

    switch (type) {
      case "string":
        result = z.string();
        break;
      case "number":
        result = z.number();
        break;
      case "integer":
        result = z.number().int();
        break;
      case "boolean":
        result = z.boolean();
        break;
      case "null":
        result = z.null();
        break;
      case "array": {
        const items = schema.items;
        result =
          items && typeof items === "object" && !Array.isArray(items)
            ? z.array(convert(items as JsonSchema, depth + 1))
            : z.array(z.any());
        break;
      }
      case "object": {
        const shape = objectShape(schema, depth + 1);
        result = shape ? z.object(shape).passthrough() : z.record(z.any());
        break;
      }
      default:
        result = z.any();
    }

    if (Array.isArray(schema.type) && schema.type.includes("null")) {
      result = result.nullable();
    }
  }

  if (typeof schema.description === "string" && schema.description) {
    result = result.describe(schema.description);
  }
  return result;
}

function objectShape(
  schema: JsonSchema,
  depth: number
): Record<string, z.ZodTypeAny> | null {
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") return null;

  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((r): r is string => typeof r === "string")
      : []
  );

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, propSchema] of Object.entries(
    properties as Record<string, unknown>
  )) {
    if (!propSchema || typeof propSchema !== "object") {
      shape[key] = z.any();
      continue;
    }
    const converted = convert(propSchema as JsonSchema, depth);
    shape[key] = required.has(key) ? converted : converted.optional();
  }
  return shape;
}

// Top-level entry: a tool's input schema → Zod raw shape for registerTool.
// Tools with no parameters (or unconvertible schemas) get an empty shape.
export function jsonSchemaToZodShape(
  schema: Record<string, unknown> | null | undefined
): Record<string, z.ZodTypeAny> {
  if (!schema) return {};
  return objectShape(schema, 0) ?? {};
}

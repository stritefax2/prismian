// Load .env in local dev before any module reads process.env.
// Harmless in production — host-provided env vars take precedence.
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { collectionRoutes } from "./routes/collections.js";
import { entryRoutes } from "./routes/entries.js";
import { searchRoutes } from "./routes/search.js";
import { agentKeyRoutes } from "./routes/agent-keys.js";
import { auditRoutes } from "./routes/audit.js";
import { documentRoutes } from "./routes/documents.js";
import { dataSourceRoutes } from "./routes/data-sources.js";
import { adminRoutes } from "./routes/admin.js";
import { errorHandler } from "./middleware/error.js";
import { serve } from "@hono/node-server";
import { startEmbeddingWorker } from "./services/embeddings.js";
import { startSyncScheduler } from "./services/connectors/sync.js";
import { assertEncryptionKeyPresent } from "./services/connectors/crypto.js";

const app = new Hono();

app.onError(errorHandler);

app.use("*", logger());

// CORS allowlist. In production set ALLOWED_ORIGINS to a comma-separated
// list of origins that may call the API (e.g. https://app.teammem.dev,
// https://staging.teammem.dev). In development, localhost is always
// allowed. Missing origin (server-to-server, curl) is allowed — auth
// middleware handles the actual authorization.
const allowedFromEnv = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const defaultDevOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
      ];

const allowedOrigins = new Set([...allowedFromEnv, ...defaultDevOrigins]);

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowedOrigins.has(origin)) return origin;
      // Deny by returning null — Hono's cors will omit the
      // Access-Control-Allow-Origin header, which browsers reject.
      return null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "x-cron-secret"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 600,
  })
);

if (process.env.NODE_ENV === "production" && allowedFromEnv.length === 0) {
  console.warn(
    "ALLOWED_ORIGINS is not set in production. All cross-origin browser " +
      "requests will be rejected. Set ALLOWED_ORIGINS=https://your-web-app.example.com"
  );
}

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/workspaces", workspaceRoutes);
app.route("/api/v1/collections", collectionRoutes);
app.route("/api/v1/entries", entryRoutes);
app.route("/api/v1/search", searchRoutes);
app.route("/api/v1/agent-keys", agentKeyRoutes);
app.route("/api/v1/audit", auditRoutes);
app.route("/api/v1/documents", documentRoutes);
app.route("/api/v1/data-sources", dataSourceRoutes);
app.route("/api/v1/admin", adminRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

// Local dev server
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`TeamMem API running on http://localhost:${info.port}`);
  });

  if (process.env.OPENAI_API_KEY) {
    startEmbeddingWorker();
  }

  if (process.env.CONNECTOR_ENCRYPTION_KEY) {
    try {
      assertEncryptionKeyPresent();
      startSyncScheduler();
    } catch (e) {
      console.error("Connector sync disabled:", e);
    }
  } else {
    console.warn(
      "CONNECTOR_ENCRYPTION_KEY not set — data source connectors will not work. " +
        "Generate with `openssl rand -base64 32`."
    );
  }
}

export default app;

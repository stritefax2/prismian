import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import type { ChangeEvent } from "@teammem/shared";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-secret";

// workspace_id -> Set of connected clients
const workspaceClients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const workspaceId = url.searchParams.get("workspace");

    if (!token || !workspaceId) {
      ws.close(4001, "Missing token or workspace");
      return;
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      ws.close(4003, "Invalid token");
      return;
    }

    if (!workspaceClients.has(workspaceId)) {
      workspaceClients.set(workspaceId, new Set());
    }
    workspaceClients.get(workspaceId)!.add(ws);

    ws.on("close", () => {
      workspaceClients.get(workspaceId)?.delete(ws);
      if (workspaceClients.get(workspaceId)?.size === 0) {
        workspaceClients.delete(workspaceId);
      }
    });

    ws.send(JSON.stringify({ type: "connected", workspace_id: workspaceId }));
  });

  return wss;
}

export function broadcast(event: ChangeEvent): void {
  const clients = workspaceClients.get(event.workspace_id);
  if (!clients) return;

  const message = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

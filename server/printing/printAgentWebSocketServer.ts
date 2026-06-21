/**
 * THERMAL-PRINTING-6C — WebSocket server wiring for print agents (transport only).
 */
import type { IncomingMessage } from "http";
import type { Server } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, type WebSocket } from "ws";
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { findAgentIdByConnection } from "./agentConnectionManager";
import { wrapWebSocketAsAgentConnection } from "./agentWebSocketConnectionAdapter";
import {
  handleAgentWebSocketDisconnect,
  handleAgentWebSocketInboundMessage,
} from "./agentWebSocketInboundHandler";
import { AgentWebSocketMessageError } from "./agentWebSocketMessageCodec";
import type { AgentWebSocketConnection } from "./agentConnectionManager";

export const PRINT_AGENT_WEBSOCKET_PATH = "/ws/print-agent";

export type PrintAgentWebSocketServerOptions = {
  path?: string;
};

type BoundConnection = {
  connection: AgentWebSocketConnection;
  disconnected: boolean;
};

function getRequestPath(request: IncomingMessage): string {
  const url = request.url ?? "/";
  return url.split("?")[0] ?? "/";
}

function logPrintAgentEvent(input: {
  type: (typeof OPS_EVENT)[keyof typeof OPS_EVENT];
  severity: "info" | "warn";
  metadata?: Record<string, unknown>;
}): void {
  opsLog({
    type: input.type,
    category: "ORDER",
    severity: input.severity,
    ts: new Date().toISOString(),
    metadata: input.metadata,
  });
}

function disconnectBoundConnection(bound: BoundConnection): void {
  if (bound.disconnected) {
    return;
  }

  bound.disconnected = true;
  const agentId = findAgentIdByConnection(bound.connection);

  if (agentId) {
    handleAgentWebSocketDisconnect(agentId);
    logPrintAgentEvent({
      type: OPS_EVENT.print_agent_disconnected,
      severity: "info",
      metadata: { agentId },
    });
    return;
  }

  logPrintAgentEvent({
    type: OPS_EVENT.print_agent_disconnected,
    severity: "info",
    metadata: { agentId: null, reason: "unregistered_connection" },
  });
}

function bindPrintAgentWebSocketConnection(ws: WebSocket): BoundConnection {
  const bound: BoundConnection = {
    connection: wrapWebSocketAsAgentConnection(ws),
    disconnected: false,
  };

  logPrintAgentEvent({
    type: OPS_EVENT.print_agent_connected,
    severity: "info",
  });

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      logPrintAgentEvent({
        type: OPS_EVENT.print_agent_message_rejected,
        severity: "warn",
        metadata: { reason: "binary_messages_not_supported" },
      });
      return;
    }

    const rawMessage = data.toString();
    try {
      handleAgentWebSocketInboundMessage(rawMessage, bound.connection);
      const agentId = findAgentIdByConnection(bound.connection);
      logPrintAgentEvent({
        type: OPS_EVENT.print_agent_message_received,
        severity: "info",
        metadata: {
          agentId: agentId ?? null,
        },
      });
    } catch (error) {
      logPrintAgentEvent({
        type: OPS_EVENT.print_agent_message_rejected,
        severity: "warn",
        metadata: {
          agentId: findAgentIdByConnection(bound.connection) ?? null,
          reason: error instanceof Error ? error.message : String(error),
          rejectedMalformed:
            error instanceof AgentWebSocketMessageError ? true : undefined,
        },
      });
    }
  });

  const onDisconnect = () => {
    disconnectBoundConnection(bound);
  };

  ws.on("close", onDisconnect);
  ws.on("error", onDisconnect);

  return bound;
}

export function attachPrintAgentWebSocketServer(
  httpServer: Server,
  options: PrintAgentWebSocketServerOptions = {}
): WebSocketServer {
  const path = options.path ?? PRINT_AGENT_WEBSOCKET_PATH;
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (getRequestPath(request) !== path) {
      return;
    }

    wss.handleUpgrade(request, socket as Duplex, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    bindPrintAgentWebSocketConnection(ws);
  });

  return wss;
}

export function bindPrintAgentWebSocketForTest(ws: WebSocket): BoundConnection {
  return bindPrintAgentWebSocketConnection(ws);
}

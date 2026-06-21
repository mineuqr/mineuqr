/**
 * THERMAL-PRINTING-6C — adapts Node ws WebSocket to AgentWebSocketConnection.
 */
import type WebSocket from "ws";
import {
  AgentWebSocketReadyState,
  type AgentWebSocketConnection,
} from "./agentConnectionManager";

export function wrapWebSocketAsAgentConnection(ws: WebSocket): AgentWebSocketConnection {
  return {
    get readyState() {
      return ws.readyState as AgentWebSocketReadyState;
    },
    send(data: string) {
      if (ws.readyState === AgentWebSocketReadyState.OPEN) {
        ws.send(data);
      }
    },
    close(code?: number, reason?: string) {
      ws.close(code, reason);
    },
  };
}

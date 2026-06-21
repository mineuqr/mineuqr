/**
 * THERMAL-PRINTING-6B — inbound WebSocket message dispatch (lifecycle integration only).
 */
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import {
  getAgentConnectivityState,
  recordAgentHeartbeat,
  registerPrintAgent,
  unregisterPrintAgent,
} from "./agentLifecycleService";
import {
  getConnection,
  registerConnection,
  type AgentWebSocketConnection,
  unregisterConnection,
} from "./agentConnectionManager";
import { parseAgentWebSocketMessage } from "./agentWebSocketMessageCodec";
import { resolvePending } from "./pendingRequestRegistry";

export class AgentWebSocketInboundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentWebSocketInboundError";
  }
}

export function handleAgentWebSocketInboundMessage(
  rawMessage: string,
  connection: AgentWebSocketConnection
): void {
  const message = parseAgentWebSocketMessage(rawMessage);

  switch (message.type) {
    case AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO:
      registerPrintAgent({
        identity: {
          agentId: message.agentId,
          platform: message.platform,
          protocolVersion: message.protocolVersion,
        },
        capabilities: message.capabilities,
      });
      registerConnection(message.agentId, connection);
      return;
    case AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT:
      recordAgentHeartbeat({
        agentId: message.agentId,
        protocolVersion: message.protocolVersion,
        timestamp: message.timestamp,
      });
      return;
    case AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_RESPONSE:
      resolvePending(message.response.requestId, message.response);
      return;
    case AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST:
      throw new AgentWebSocketInboundError(
        "Print requests are outbound-only on the WebSocket channel"
      );
    default:
      throw new AgentWebSocketInboundError("Unsupported WebSocket message type");
  }
}

export function handleAgentWebSocketDisconnect(agentId: string): void {
  unregisterConnection(agentId);
  unregisterPrintAgent(agentId);
}

export function getConnectedAgentConnectivityState(agentId: string) {
  if (!getConnection(agentId)) {
    return undefined;
  }

  return getAgentConnectivityState(agentId);
}

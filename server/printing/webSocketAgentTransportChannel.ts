/**
 * THERMAL-PRINTING-6B — WebSocket-based AgentTransportChannel implementation.
 */
import type { PrintAgentRequest, PrintAgentResponse } from "../../shared/printing/printAgentProtocol";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import type { AgentTransportChannel } from "./agentTransportChannelTypes";
import { getConnection, AgentWebSocketReadyState } from "./agentConnectionManager";
import {
  buildAgentPrintRequestMessage,
  serializeAgentWebSocketMessage,
} from "./agentWebSocketMessageCodec";
import {
  DEFAULT_PENDING_REQUEST_TIMEOUT_MS,
  PendingRequestTimeoutError,
  registerPending,
} from "./pendingRequestRegistry";
import { createPrintAgentResponse } from "./printAgentProtocol";

export const WEBSOCKET_AGENT_TRANSPORT_CHANNEL_ID = "websocket" as const;

export class WebSocketAgentTransportChannel implements AgentTransportChannel {
  readonly channelId = WEBSOCKET_AGENT_TRANSPORT_CHANNEL_ID;

  constructor(
    private readonly agentId: string,
    private readonly pendingRequestTimeoutMs: number = DEFAULT_PENDING_REQUEST_TIMEOUT_MS
  ) {}

  async send(request: PrintAgentRequest): Promise<PrintAgentResponse> {
    const connection = getConnection(this.agentId);
    if (!connection || connection.connection.readyState !== AgentWebSocketReadyState.OPEN) {
      return createPrintAgentResponse({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        accepted: false,
        error: "Agent not connected",
      });
    }

    try {
      const responsePromise = registerPending(request.requestId, {
        agentId: this.agentId,
        timeoutMs: this.pendingRequestTimeoutMs,
      });

      const wireMessage = buildAgentPrintRequestMessage(request);
      connection.connection.send(serializeAgentWebSocketMessage(wireMessage));

      return await responsePromise;
    } catch (error) {
      if (error instanceof PendingRequestTimeoutError) {
        return createPrintAgentResponse({
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          accepted: false,
          error: error.message,
        });
      }

      throw error;
    }
  }
}

export function createWebSocketAgentTransportChannel(
  agentId: string,
  pendingRequestTimeoutMs: number = DEFAULT_PENDING_REQUEST_TIMEOUT_MS
): WebSocketAgentTransportChannel {
  return new WebSocketAgentTransportChannel(agentId, pendingRequestTimeoutMs);
}

export function isAgentPrintRequestWireMessage(rawMessage: string): boolean {
  try {
    const parsed = JSON.parse(rawMessage) as { type?: string };
    return parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST;
  } catch {
    return false;
  }
}

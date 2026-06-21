/**
 * THERMAL-PRINTING-6B — WebSocket message parsing and serialization.
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import {
  AGENT_WEBSOCKET_MESSAGE_TYPES,
  type AgentHello,
  type AgentHeartbeat,
  type AgentPrintRequest,
  type AgentPrintResponse,
  type AgentWebSocketMessage,
} from "../../shared/printing/agentWebSocketMessages";
import type {
  PrintAgentCapabilities,
  PrintAgentRequest,
  PrintAgentResponse,
} from "../../shared/printing/printAgentProtocol";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentWebSocketMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentWebSocketMessageError";
  }
}

export function validateWebSocketProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentWebSocketMessageError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export function serializeAgentWebSocketMessage(message: AgentWebSocketMessage): string {
  validateWebSocketProtocolVersion(message.protocolVersion);
  return JSON.stringify(message);
}

export function parseAgentWebSocketMessage(rawMessage: string): AgentWebSocketMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentWebSocketMessageError("Invalid WebSocket message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentWebSocketMessageError("WebSocket message must be an object");
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  const protocolVersion = message.protocolVersion;

  if (typeof type !== "string") {
    throw new AgentWebSocketMessageError("WebSocket message type is required");
  }
  if (typeof protocolVersion !== "string") {
    throw new AgentWebSocketMessageError("WebSocket protocol version is required");
  }

  validateWebSocketProtocolVersion(protocolVersion);

  switch (type) {
    case AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO:
      return parseAgentHello(message, protocolVersion);
    case AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT:
      return parseAgentHeartbeat(message, protocolVersion);
    case AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST:
      return parseAgentPrintRequest(message, protocolVersion);
    case AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_RESPONSE:
      return parseAgentPrintResponse(message, protocolVersion);
    default:
      throw new AgentWebSocketMessageError(`Unknown WebSocket message type: ${type}`);
  }
}

function parseAgentHello(message: Record<string, unknown>, protocolVersion: string): AgentHello {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentWebSocketMessageError("Agent hello requires agentId");
  }
  if (!isSupportedPlatform(message.platform)) {
    throw new AgentWebSocketMessageError("Agent hello requires a supported platform");
  }
  if (!message.capabilities || typeof message.capabilities !== "object") {
    throw new AgentWebSocketMessageError("Agent hello requires capabilities");
  }

  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
    protocolVersion,
    agentId: message.agentId,
    platform: message.platform,
    capabilities: message.capabilities as PrintAgentCapabilities,
  };
}

function parseAgentHeartbeat(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentHeartbeat {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentWebSocketMessageError("Agent heartbeat requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentWebSocketMessageError("Agent heartbeat requires timestamp");
  }

  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT,
    protocolVersion,
    agentId: message.agentId,
    timestamp: message.timestamp,
  };
}

function parseAgentPrintRequest(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentPrintRequest {
  if (!message.request || typeof message.request !== "object") {
    throw new AgentWebSocketMessageError("Agent print request requires request payload");
  }

  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST,
    protocolVersion,
    request: message.request as PrintAgentRequest,
  };
}

function parseAgentPrintResponse(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentPrintResponse {
  if (!message.response || typeof message.response !== "object") {
    throw new AgentWebSocketMessageError("Agent print response requires response payload");
  }

  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_RESPONSE,
    protocolVersion,
    response: message.response as PrintAgentResponse,
  };
}

function isSupportedPlatform(platform: unknown): platform is AgentPlatform {
  return platform === "windows" || platform === "android" || platform === "ios";
}

export function buildAgentPrintRequestMessage(request: PrintAgentRequest): AgentPrintRequest {
  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    request,
  };
}

export function buildAgentPrintResponseMessage(response: PrintAgentResponse): AgentPrintResponse {
  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_RESPONSE,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    response,
  };
}

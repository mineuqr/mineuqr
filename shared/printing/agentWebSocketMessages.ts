/**
 * THERMAL-PRINTING-6B — WebSocket wire message contracts (versioned).
 */
import type { AgentPlatform } from "./agentTypes";
import type {
  PrintAgentCapabilities,
  PrintAgentRequest,
  PrintAgentResponse,
} from "./printAgentProtocol";

export const AGENT_WEBSOCKET_MESSAGE_TYPES = {
  HELLO: "agent.hello",
  HEARTBEAT: "agent.heartbeat",
  PRINT_REQUEST: "agent.print.request",
  PRINT_RESPONSE: "agent.print.response",
} as const;

export type AgentWebSocketMessageType =
  (typeof AGENT_WEBSOCKET_MESSAGE_TYPES)[keyof typeof AGENT_WEBSOCKET_MESSAGE_TYPES];

export interface AgentHello {
  type: typeof AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO;
  protocolVersion: string;
  agentId: string;
  platform: AgentPlatform;
  capabilities: PrintAgentCapabilities;
}

export interface AgentHeartbeat {
  type: typeof AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT;
  protocolVersion: string;
  agentId: string;
  timestamp: string;
}

export interface AgentPrintRequest {
  type: typeof AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST;
  protocolVersion: string;
  request: PrintAgentRequest;
}

export interface AgentPrintResponse {
  type: typeof AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_RESPONSE;
  protocolVersion: string;
  response: PrintAgentResponse;
}

export type AgentWebSocketMessage =
  | AgentHello
  | AgentHeartbeat
  | AgentPrintRequest
  | AgentPrintResponse;

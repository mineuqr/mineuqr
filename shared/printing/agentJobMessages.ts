/**
 * THERMAL-PRINTING-6D Phase-2 — agent job wire message contracts (versioned).
 */
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";

export const AGENT_JOB_MESSAGE_TYPES = {
  JOB_ASSIGNED: "agent.job.assigned",
  JOB_FETCH_REQUEST: "agent.job.fetch.request",
  JOB_FETCH_RESPONSE: "agent.job.fetch.response",
  DELIVERY_ACK: "agent.job.delivery.ack",
} as const;

export type AgentJobMessageType =
  (typeof AGENT_JOB_MESSAGE_TYPES)[keyof typeof AGENT_JOB_MESSAGE_TYPES];

export interface AgentJobAssignedMessage {
  type: typeof AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED;
  protocolVersion: string;
  agentId: string;
  jobId: number;
  timestamp: string;
}

export interface AgentJobFetchRequestMessage {
  type: typeof AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST;
  protocolVersion: string;
  agentId: string;
  jobId: number;
  requestId: string;
}

export interface AgentJobTicketPayload {
  orderId: number;
  restaurantId: number;
  items: Array<{
    itemName: string;
    quantity: number;
    notes?: string | null;
  }>;
}

export interface AgentJobPayload {
  jobId: number;
  restaurantId: number;
  printerId: number;
  orderId: number;
  ticket: AgentJobTicketPayload;
}

export interface AgentJobFetchResponseMessage {
  type: typeof AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE;
  protocolVersion: string;
  requestId: string;
  found: boolean;
  job?: AgentJobPayload;
  error?: string;
}

export interface AgentJobDeliveryAckMessage {
  type: typeof AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK;
  protocolVersion: string;
  agentId: string;
  jobId: number;
  timestamp: string;
}

export type AgentJobWireMessage =
  | AgentJobAssignedMessage
  | AgentJobFetchRequestMessage
  | AgentJobFetchResponseMessage
  | AgentJobDeliveryAckMessage;

export const DEFAULT_AGENT_JOB_PROTOCOL_VERSION = SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

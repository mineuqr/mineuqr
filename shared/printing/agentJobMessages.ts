/**
 * THERMAL-PRINTING-6D Phase-2 — agent job wire message contracts (versioned).
 */
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";

export const AGENT_JOB_MESSAGE_TYPES = {
  JOB_ASSIGNED: "agent.job.assigned",
  JOB_FETCH_REQUEST: "agent.job.fetch.request",
  JOB_FETCH_RESPONSE: "agent.job.fetch.response",
  DELIVERY_ACK: "agent.job.delivery.ack",
  DELIVERY_CONFIRMED: "agent.job.delivery.confirmed",
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

export interface AgentJobDeliveryConfirmedMessage {
  type: typeof AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED;
  protocolVersion: string;
  agentId: string;
  jobId: string;
  timestamp: string;
}

export class AgentJobDeliveryConfirmationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentJobDeliveryConfirmationValidationError";
  }
}

export type AgentJobDeliveryConfirmedPayload = {
  agentId: string;
  jobId: string;
  timestamp: string;
};

export function parseAgentJobDeliveryConfirmedJobId(jobId: string): number {
  const trimmed = jobId.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new AgentJobDeliveryConfirmationValidationError("Invalid jobId");
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AgentJobDeliveryConfirmationValidationError("Invalid jobId");
  }

  return parsed;
}

export function validateAgentJobDeliveryConfirmedPayload(
  payload: AgentJobDeliveryConfirmedPayload
): { agentId: string; jobId: number; timestamp: string } {
  const agentId = payload.agentId.trim();
  if (!agentId) {
    throw new AgentJobDeliveryConfirmationValidationError("agentId is required");
  }

  const timestamp = payload.timestamp.trim();
  if (!timestamp) {
    throw new AgentJobDeliveryConfirmationValidationError("timestamp is required");
  }

  return {
    agentId,
    jobId: parseAgentJobDeliveryConfirmedJobId(payload.jobId),
    timestamp,
  };
}

export type AgentJobWireMessage =
  | AgentJobAssignedMessage
  | AgentJobFetchRequestMessage
  | AgentJobFetchResponseMessage
  | AgentJobDeliveryAckMessage
  | AgentJobDeliveryConfirmedMessage;

export const DEFAULT_AGENT_JOB_PROTOCOL_VERSION = SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

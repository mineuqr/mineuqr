/**
 * THERMAL-PRINTING-7A — agent job wire message parsing (transport boundary).
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  type AgentJobDeliveryAckMessage,
  type AgentJobDeliveryConfirmedMessage,
  type AgentJobFetchRequestMessage,
  type AgentJobWireMessage,
} from "../../shared/printing/agentJobMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentJobWireMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentJobWireMessageError";
  }
}

function validateProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentJobWireMessageError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export function tryParseAgentJobInboundMessage(
  rawMessage: string
): AgentJobFetchRequestMessage | AgentJobDeliveryAckMessage | AgentJobDeliveryConfirmedMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  if (
    type !== AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST &&
    type !== AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK &&
    type !== AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED
  ) {
    return null;
  }

  return parseAgentJobWireMessage(rawMessage) as
    | AgentJobFetchRequestMessage
    | AgentJobDeliveryAckMessage
    | AgentJobDeliveryConfirmedMessage;
}

export function parseAgentJobWireMessage(rawMessage: string): AgentJobWireMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentJobWireMessageError("Invalid agent job message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentJobWireMessageError("Agent job message must be an object");
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  const protocolVersion = message.protocolVersion;

  if (typeof type !== "string") {
    throw new AgentJobWireMessageError("Agent job message type is required");
  }
  if (typeof protocolVersion !== "string") {
    throw new AgentJobWireMessageError("Agent job protocol version is required");
  }

  validateProtocolVersion(protocolVersion);

  switch (type) {
    case AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST:
      return parseJobFetchRequest(message, protocolVersion);
    case AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK:
      return parseDeliveryAck(message, protocolVersion);
    case AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED:
      return parseDeliveryConfirmed(message, protocolVersion);
    default:
      throw new AgentJobWireMessageError(`Unsupported agent job message type: ${type}`);
  }
}

function parseJobFetchRequest(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentJobFetchRequestMessage {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentJobWireMessageError("Job fetch request requires agentId");
  }
  if (typeof message.requestId !== "string" || !message.requestId.trim()) {
    throw new AgentJobWireMessageError("Job fetch request requires requestId");
  }
  if (!Number.isInteger(message.jobId) || (message.jobId as number) <= 0) {
    throw new AgentJobWireMessageError("Job fetch request requires jobId");
  }

  return {
    type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST,
    protocolVersion,
    agentId: message.agentId,
    jobId: message.jobId as number,
    requestId: message.requestId,
  };
}

function parseDeliveryAck(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentJobDeliveryAckMessage {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentJobWireMessageError("Delivery ack requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentJobWireMessageError("Delivery ack requires timestamp");
  }
  if (!Number.isInteger(message.jobId) || (message.jobId as number) <= 0) {
    throw new AgentJobWireMessageError("Delivery ack requires jobId");
  }

  return {
    type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK,
    protocolVersion,
    agentId: message.agentId,
    jobId: message.jobId as number,
    timestamp: message.timestamp,
  };
}

function parseDeliveryConfirmed(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentJobDeliveryConfirmedMessage {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentJobWireMessageError("Delivery confirmation requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentJobWireMessageError("Delivery confirmation requires timestamp");
  }
  if (typeof message.jobId !== "string" || !message.jobId.trim()) {
    throw new AgentJobWireMessageError("Delivery confirmation requires jobId");
  }

  return {
    type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED,
    protocolVersion,
    agentId: message.agentId,
    jobId: message.jobId,
    timestamp: message.timestamp,
  };
}

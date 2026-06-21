/**
 * THERMAL-PRINTING-6D Phase-2 — delivery acknowledgement (received ≠ printed).
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobDeliveryAckMessage,
} from "../../shared/printing/agentJobMessages";

export type DeliveryAckPayload = {
  agentId: string;
  jobId: number;
  timestamp: string;
};

export type DeliveryAckSender = {
  send(data: string): void;
};

export class DeliveryAckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAckError";
  }
}

export function buildDeliveryAckMessage(payload: DeliveryAckPayload): AgentJobDeliveryAckMessage {
  if (!payload.agentId.trim()) {
    throw new DeliveryAckError("agentId is required");
  }
  if (!Number.isInteger(payload.jobId) || payload.jobId <= 0) {
    throw new DeliveryAckError("jobId is required");
  }
  if (!payload.timestamp.trim()) {
    throw new DeliveryAckError("timestamp is required");
  }

  return {
    type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK,
    protocolVersion: DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
    agentId: payload.agentId,
    jobId: payload.jobId,
    timestamp: payload.timestamp,
  };
}

export class DeliveryAckTracker {
  private readonly acknowledgedJobIds = new Set<number>();

  hasAcknowledged(jobId: number): boolean {
    return this.acknowledgedJobIds.has(jobId);
  }

  markAcknowledged(jobId: number): void {
    this.acknowledgedJobIds.add(jobId);
  }

  clear(): void {
    this.acknowledgedJobIds.clear();
  }
}

export function acknowledgeDelivery(input: {
  payload: DeliveryAckPayload;
  sender: DeliveryAckSender;
  tracker: DeliveryAckTracker;
}): boolean {
  if (input.tracker.hasAcknowledged(input.payload.jobId)) {
    return false;
  }

  const message = buildDeliveryAckMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markAcknowledged(input.payload.jobId);
  return true;
}

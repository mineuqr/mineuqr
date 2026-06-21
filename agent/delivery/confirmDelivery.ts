/**
 * THERMAL-PRINTING-7B.2 — delivery confirmation (delivered to printer transport ≠ printed).
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobDeliveryConfirmedMessage,
} from "../../shared/printing/agentJobMessages";
import type { ExecutionPipeline } from "../execution/executionPipeline";
import { assertLocalJobStateTransition } from "../execution/stateMachine";
import type { LocalJobState } from "../execution/executionTypes";

export type DeliveryConfirmationPayload = {
  agentId: string;
  jobId: number;
  timestamp: string;
};

export type DeliveryConfirmationSender = {
  send(data: string): void;
};

export class DeliveryConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryConfirmationError";
  }
}

const CONFIRMABLE_LOCAL_STATES: readonly LocalJobState[] = ["prepared", "acknowledged"];

export function buildDeliveryConfirmedMessage(
  payload: DeliveryConfirmationPayload
): AgentJobDeliveryConfirmedMessage {
  if (!payload.agentId.trim()) {
    throw new DeliveryConfirmationError("agentId is required");
  }
  if (!Number.isInteger(payload.jobId) || payload.jobId <= 0) {
    throw new DeliveryConfirmationError("jobId is required");
  }
  if (!payload.timestamp.trim()) {
    throw new DeliveryConfirmationError("timestamp is required");
  }

  return {
    type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED,
    protocolVersion: DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
    agentId: payload.agentId,
    jobId: String(payload.jobId),
    timestamp: payload.timestamp,
  };
}

export class DeliveryConfirmationTracker {
  private readonly confirmedJobIds = new Set<number>();

  hasConfirmed(jobId: number): boolean {
    return this.confirmedJobIds.has(jobId);
  }

  markConfirmed(jobId: number): void {
    this.confirmedJobIds.add(jobId);
  }

  clear(): void {
    this.confirmedJobIds.clear();
  }
}

export function confirmDelivery(input: {
  payload: DeliveryConfirmationPayload;
  sender: DeliveryConfirmationSender;
  tracker: DeliveryConfirmationTracker;
  pipeline: ExecutionPipeline;
}): boolean {
  if (input.tracker.hasConfirmed(input.payload.jobId)) {
    return false;
  }

  const record = input.pipeline.getStore().get(input.payload.jobId);
  if (!record) {
    throw new DeliveryConfirmationError(`Local job not found: ${input.payload.jobId}`);
  }
  if (!CONFIRMABLE_LOCAL_STATES.includes(record.state)) {
    throw new DeliveryConfirmationError(
      `Delivery confirmation requires prepared state (current: ${record.state})`
    );
  }

  assertLocalJobStateTransition(record.state, "delivered");
  input.pipeline.markDelivered(input.payload.jobId);

  const message = buildDeliveryConfirmedMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markConfirmed(input.payload.jobId);
  return true;
}

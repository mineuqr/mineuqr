/**
 * THERMAL-PRINTING-7B.4 — delivery state tracking (acknowledged → delivered only).
 */

export type JobDeliveryTrackingState = "acknowledged" | "delivered";

export type JobDeliveryStateRecord = {
  jobId: number;
  agentId: string;
  state: JobDeliveryTrackingState;
  acknowledgedAt: string;
  deliveredAt?: string;
};

export class JobDeliveryStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobDeliveryStateError";
  }
}

export type MarkJobDeliveryAcknowledgedInput = {
  jobId: number;
  agentId: string;
  timestamp: string;
};

export type MarkJobDeliveryConfirmedInput = {
  jobId: number;
  agentId: string;
  timestamp: string;
};

export type MarkJobDeliveryConfirmedResult =
  | { accepted: true; duplicate: false; record: JobDeliveryStateRecord }
  | { accepted: true; duplicate: true; record: JobDeliveryStateRecord }
  | { accepted: false; reason: string };

const deliveryStates = new Map<string, JobDeliveryStateRecord>();

function buildDeliveryStateKey(agentId: string, jobId: number): string {
  return `${agentId.trim()}:${jobId}`;
}

export function getJobDeliveryState(
  agentId: string,
  jobId: number
): JobDeliveryStateRecord | undefined {
  return deliveryStates.get(buildDeliveryStateKey(agentId, jobId));
}

export function clearJobDeliveryStates(): void {
  deliveryStates.clear();
}

export function markJobDeliveryAcknowledged(
  input: MarkJobDeliveryAcknowledgedInput
): JobDeliveryStateRecord {
  const normalizedAgentId = input.agentId.trim();
  const key = buildDeliveryStateKey(normalizedAgentId, input.jobId);
  const existing = deliveryStates.get(key);

  if (existing) {
    return existing;
  }

  const record: JobDeliveryStateRecord = {
    jobId: input.jobId,
    agentId: normalizedAgentId,
    state: "acknowledged",
    acknowledgedAt: input.timestamp,
  };
  deliveryStates.set(key, record);
  return record;
}

export function markJobDeliveryConfirmed(
  input: MarkJobDeliveryConfirmedInput
): MarkJobDeliveryConfirmedResult {
  const normalizedAgentId = input.agentId.trim();
  const key = buildDeliveryStateKey(normalizedAgentId, input.jobId);
  const existing = deliveryStates.get(key);

  if (!existing) {
    return {
      accepted: false,
      reason: "Delivery must be acknowledged before confirmation",
    };
  }

  if (existing.state === "delivered") {
    return { accepted: true, duplicate: true, record: existing };
  }

  if (existing.state !== "acknowledged") {
    return {
      accepted: false,
      reason: `Invalid delivery state transition: ${existing.state} -> delivered`,
    };
  }

  const record: JobDeliveryStateRecord = {
    ...existing,
    state: "delivered",
    deliveredAt: input.timestamp,
  };
  deliveryStates.set(key, record);

  return { accepted: true, duplicate: false, record };
}

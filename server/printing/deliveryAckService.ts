/**
 * THERMAL-PRINTING-7A.4 — delivery acknowledgement handling (received only, not printed).
 */
import { getAgent } from "./agentRegistry";
import { getPrintJobAssignment } from "./assignmentService";
import { getDiagnosticPrintAssignment } from "./diagnosticAssignmentService";
import {
  diagnosticRunIdFromWireJobId,
  isDiagnosticWireJobId,
} from "../../shared/printing/diagnosticPrint";
import { updatePrintDiagnosticRun } from "./diagnosticPrintRepository";
import { markJobDeliveryAcknowledged } from "./deliveryStateTracker";
import { findPrintJobById } from "./printJobRepository";

export class DeliveryAckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAckError";
  }
}

export type DeliveryAckInput = {
  agentId: string;
  jobId: number;
  timestamp: string;
};

export type DeliveryAckRecord = DeliveryAckInput & {
  recordedAt: string;
};

export type RecordDeliveryAcknowledgementResult =
  | { accepted: true; duplicate: false; record: DeliveryAckRecord }
  | { accepted: true; duplicate: true; record: DeliveryAckRecord }
  | { accepted: false; reason: string };

const deliveryAcks = new Map<string, DeliveryAckRecord>();

function buildDeliveryAckKey(agentId: string, jobId: number): string {
  return `${agentId.trim()}:${jobId}`;
}

export function getDeliveryAckRecord(
  agentId: string,
  jobId: number
): DeliveryAckRecord | undefined {
  return deliveryAcks.get(buildDeliveryAckKey(agentId, jobId));
}

export function clearDeliveryAcks(): void {
  deliveryAcks.clear();
}

export async function recordDeliveryAcknowledgement(
  input: DeliveryAckInput
): Promise<RecordDeliveryAcknowledgementResult> {
  const normalizedAgentId = input.agentId.trim();
  if (!normalizedAgentId) {
    return { accepted: false, reason: "Agent id is required" };
  }
  if (!Number.isInteger(input.jobId) || input.jobId <= 0) {
    return { accepted: false, reason: "Invalid jobId" };
  }
  if (!input.timestamp.trim()) {
    return { accepted: false, reason: "Timestamp is required" };
  }

  const agent = getAgent(normalizedAgentId);
  if (!agent) {
    return { accepted: false, reason: "Agent not registered" };
  }

  if (isDiagnosticWireJobId(input.jobId)) {
    return recordDiagnosticDeliveryAcknowledgement({
      agentId: normalizedAgentId,
      wireJobId: input.jobId,
      timestamp: input.timestamp,
    });
  }

  const assignment = getPrintJobAssignment(input.jobId);
  if (!assignment) {
    return { accepted: false, reason: "Print job assignment not found" };
  }
  if (assignment.agentId !== normalizedAgentId) {
    return { accepted: false, reason: "Print job is not assigned to this agent" };
  }

  const job = await findPrintJobById(input.jobId);
  if (!job) {
    return { accepted: false, reason: "Print job not found" };
  }

  const key = buildDeliveryAckKey(normalizedAgentId, input.jobId);
  const existing = deliveryAcks.get(key);
  if (existing) {
    return { accepted: true, duplicate: true, record: existing };
  }

  const record: DeliveryAckRecord = {
    agentId: normalizedAgentId,
    jobId: input.jobId,
    timestamp: input.timestamp,
    recordedAt: new Date().toISOString(),
  };
  deliveryAcks.set(key, record);
  markJobDeliveryAcknowledged({
    jobId: input.jobId,
    agentId: normalizedAgentId,
    timestamp: input.timestamp,
  });

  return { accepted: true, duplicate: false, record };
}

async function recordDiagnosticDeliveryAcknowledgement(input: {
  agentId: string;
  wireJobId: number;
  timestamp: string;
}): Promise<RecordDeliveryAcknowledgementResult> {
  const assignment = getDiagnosticPrintAssignment(input.wireJobId);
  if (!assignment) {
    return { accepted: false, reason: "Diagnostic print assignment not found" };
  }
  if (assignment.agentId !== input.agentId) {
    return { accepted: false, reason: "Diagnostic print is not assigned to this agent" };
  }

  const key = buildDeliveryAckKey(input.agentId, input.wireJobId);
  const existing = deliveryAcks.get(key);
  if (existing) {
    return { accepted: true, duplicate: true, record: existing };
  }

  const record: DeliveryAckRecord = {
    agentId: input.agentId,
    jobId: input.wireJobId,
    timestamp: input.timestamp,
    recordedAt: new Date().toISOString(),
  };
  deliveryAcks.set(key, record);

  const diagnosticRunId = diagnosticRunIdFromWireJobId(input.wireJobId);
  await updatePrintDiagnosticRun({
    id: diagnosticRunId,
    status: "completed",
    completedAt: record.recordedAt,
    error: null,
  });

  return { accepted: true, duplicate: false, record };
}

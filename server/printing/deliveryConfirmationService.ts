/**
 * THERMAL-PRINTING-7B.3 — delivery confirmation handling (delivered ≠ printed).
 */
import { getAgent } from "./agentRegistry";
import { getPrintJobAssignment } from "./assignmentService";
import {
  getJobDeliveryState,
  markJobDeliveryConfirmed,
  type JobDeliveryStateRecord,
} from "./deliveryStateTracker";
import { findPrintJobById } from "./printJobRepository";

export type DeliveryConfirmationInput = {
  agentId: string;
  jobId: number;
  timestamp: string;
};

export type RecordDeliveryConfirmationResult =
  | { accepted: true; duplicate: false; record: JobDeliveryStateRecord }
  | { accepted: true; duplicate: true; record: JobDeliveryStateRecord }
  | { accepted: false; reason: string };

export async function recordDeliveryConfirmation(
  input: DeliveryConfirmationInput
): Promise<RecordDeliveryConfirmationResult> {
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

  const currentState = getJobDeliveryState(normalizedAgentId, input.jobId);
  if (!currentState) {
    return {
      accepted: false,
      reason: "Delivery must be acknowledged before confirmation",
    };
  }

  return markJobDeliveryConfirmed({
    jobId: input.jobId,
    agentId: normalizedAgentId,
    timestamp: input.timestamp,
  });
}

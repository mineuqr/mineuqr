/**
 * THERMAL-PRINTING-7E.4 — job protocol status receiver (jobStatus ≠ printStatus).
 */
import { getAgent } from "./agentRegistry";
import { getPrintJobAssignment } from "./assignmentService";
import { findPrintJobById } from "./printJobRepository";
import {
  upsertJobProtocolStatus,
  type JobProtocolStatusRecord,
} from "./protocolStatusStore";
import type { ProtocolJobLifecycleState } from "../../shared/printing/agentProtocolStatusMessages";

export type RecordJobStatusReportInput = {
  agentId: string;
  jobId: number;
  state: ProtocolJobLifecycleState;
  timestamp: string;
};

export type RecordJobStatusReportResult =
  | { accepted: true; duplicate: false; record: JobProtocolStatusRecord }
  | { accepted: true; duplicate: true; record: JobProtocolStatusRecord }
  | { accepted: false; reason: string };

export async function recordJobStatusReport(
  input: RecordJobStatusReportInput
): Promise<RecordJobStatusReportResult> {
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

  return upsertJobProtocolStatus({
    jobId: input.jobId,
    agentId: normalizedAgentId,
    state: input.state,
    timestamp: input.timestamp,
  });
}

/**
 * THERMAL-PRINTING-10C — execution outcome report receiver.
 */
import { getAgent } from "./agentRegistry";
import { resolvePrintJobAssignment } from "./assignmentService";
import { findPrintJobById } from "./printJobRepository";
import {
  mapExecutionOutcomeToTransition,
  transitionPrintJobExecutionState,
} from "./printJobExecutionState";
import {
  upsertJobExecutionOutcome,
  type JobExecutionOutcomeRecord,
} from "./executionOutcomeStore";
import type {
  ExecutionOutcomeReportCategory,
} from "../../shared/printing/executionOutcomeMessages";
import type { ExecutionOutcomeStatus } from "../../shared/printing/executionOutcome";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";

export type RecordExecutionOutcomeReportInput = {
  agentId: string;
  jobId: number;
  outcomeStatus: ExecutionOutcomeStatus;
  category: ExecutionOutcomeReportCategory;
  transport?: ExecutionTransport;
  message?: string;
  timestamp: string;
};

export type RecordExecutionOutcomeReportResult =
  | { accepted: true; duplicate: false; record: JobExecutionOutcomeRecord }
  | { accepted: true; duplicate: true; record: JobExecutionOutcomeRecord }
  | { accepted: false; reason: string };

export async function recordExecutionOutcomeReport(
  input: RecordExecutionOutcomeReportInput
): Promise<RecordExecutionOutcomeReportResult> {
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

  const assignment = await resolvePrintJobAssignment(input.jobId);
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

  const stored = upsertJobExecutionOutcome({
    jobId: input.jobId,
    agentId: normalizedAgentId,
    outcomeStatus: input.outcomeStatus,
    category: input.category,
    transport: input.transport,
    message: input.message,
    timestamp: input.timestamp,
  });

  if (!stored.duplicate) {
    const transition = mapExecutionOutcomeToTransition(input.outcomeStatus);
    const transitionResult = await transitionPrintJobExecutionState({
      jobId: input.jobId,
      transition,
      agentId: normalizedAgentId,
      failureMessage: input.message,
    });
    if ("rejected" in transitionResult) {
      return { accepted: false, reason: transitionResult.reason };
    }
  }

  return stored;
}

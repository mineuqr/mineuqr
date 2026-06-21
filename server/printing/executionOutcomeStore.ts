/**
 * THERMAL-PRINTING-10C — execution outcome store (server visibility).
 */
import type {
  ExecutionOutcomeReportCategory,
} from "../../shared/printing/executionOutcomeMessages";
import type { ExecutionOutcomeStatus } from "../../shared/printing/executionOutcome";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";

export type JobExecutionOutcomeRecord = {
  jobId: number;
  agentId: string;
  outcomeStatus: ExecutionOutcomeStatus;
  category: ExecutionOutcomeReportCategory;
  transport?: ExecutionTransport;
  message?: string;
  timestamp: string;
  updatedAt: string;
};

export type RecordExecutionOutcomeReportInput = {
  jobId: number;
  agentId: string;
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

const executionOutcomes = new Map<number, JobExecutionOutcomeRecord>();

function isDuplicateReport(
  existing: JobExecutionOutcomeRecord | undefined,
  incoming: RecordExecutionOutcomeReportInput
): boolean {
  return (
    existing?.category === incoming.category &&
    existing.timestamp === incoming.timestamp &&
    existing.outcomeStatus === incoming.outcomeStatus
  );
}

export function getStoredJobExecutionOutcome(
  jobId: number
): JobExecutionOutcomeRecord | undefined {
  return executionOutcomes.get(jobId);
}

export function clearExecutionOutcomeStore(): void {
  executionOutcomes.clear();
}

export function upsertJobExecutionOutcome(
  input: RecordExecutionOutcomeReportInput,
  updatedAt: string = new Date().toISOString()
): { accepted: true; duplicate: boolean; record: JobExecutionOutcomeRecord } {
  const existing = executionOutcomes.get(input.jobId);

  if (isDuplicateReport(existing, input)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  const record: JobExecutionOutcomeRecord = {
    jobId: input.jobId,
    agentId: input.agentId.trim(),
    outcomeStatus: input.outcomeStatus,
    category: input.category,
    transport: input.transport,
    message: input.message,
    timestamp: input.timestamp,
    updatedAt,
  };
  executionOutcomes.set(input.jobId, record);

  return { accepted: true, duplicate: false, record };
}

import type { PrintJobAttemptRecord } from "../contracts/repositories/PrintJobAttemptRepository";
import type { PrintJobRecord } from "../contracts/repositories/PrintJobRepository";
import type {
  PrintWorkspacePrintAttemptDto,
  PrintWorkspacePrintJobDto,
} from "../../print-workspace/read/contracts/printWorkspaceQueryContracts";

export function mapPrintAttemptToWorkspaceDto(
  attempt: PrintJobAttemptRecord
): PrintWorkspacePrintAttemptDto {
  return {
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    outcome: attempt.outcome,
    errorMessage: attempt.errorMessage,
    createdAt: attempt.createdAt,
  };
}

export function mapPrintJobToWorkspaceDto(
  job: PrintJobRecord,
  input: {
    printerName: string | null;
    attempts: PrintJobAttemptRecord[];
  }
): PrintWorkspacePrintJobDto {
  const attempts = [...input.attempts]
    .map(mapPrintAttemptToWorkspaceDto)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    id: job.id,
    status: job.status,
    source: job.source,
    attemptCount: job.attemptCount,
    lastError: job.lastError,
    printerName: input.printerName,
    createdAt: job.createdAt,
    dispatchedAt: job.dispatchedAt,
    printingAt: job.printingAt,
    completedAt: job.completedAt,
    attempts,
  };
}

import type { PrintJobRecord } from "../contracts/repositories/PrintJobRepository";
import type { PrintWorkspacePrintJobDto } from "../../print-workspace/read/contracts/printWorkspaceQueryContracts";

export function mapPrintJobToWorkspaceDto(job: PrintJobRecord): PrintWorkspacePrintJobDto {
  return {
    id: job.id,
    status: job.status,
    source: job.source,
    attemptCount: job.attemptCount,
    lastError: job.lastError,
    createdAt: job.createdAt,
    dispatchedAt: job.dispatchedAt,
    printingAt: job.printingAt,
    completedAt: job.completedAt,
  };
}

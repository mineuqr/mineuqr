/**
 * THERMAL-PRINTING-3C.3 — LEGACY/DORMANT server-side print processor worker.
 *
 * THERMAL-PRINTING-9D: Not the authoritative execution path. See executionAuthority.ts.
 * Authoritative execution is agent-runtime (assignment → fetch → context/strategy → consumption).
 * This worker remains for historical tests only and is not scheduled in production.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { claimNextPrintJob } from "./printJobClaimService";
import { executePrintJob } from "./executePrintJob";
import {
  completePrintExecution,
  failPrintExecution,
  startPrintExecution,
} from "./printJobExecutionService";
import {
  PrintJobValidationError,
  type ProcessNextPrintJobInput,
  type ProcessNextPrintJobResult,
} from "./printJobTypes";

function assertValidWorkerInput(input: ProcessNextPrintJobInput): void {
  if (!Number.isInteger(input.workerId) || input.workerId <= 0) {
    throw new PrintJobValidationError("Invalid workerId");
  }
  if (
    input.printerId != null &&
    (!Number.isInteger(input.printerId) || input.printerId <= 0)
  ) {
    throw new PrintJobValidationError("Invalid printerId");
  }
}

function logProcessorEvent(input: {
  type: string;
  severity: "info" | "warn";
  restaurantId?: number;
  metadata: Record<string, unknown>;
}): void {
  opsLog({
    type: input.type,
    category: "ORDER",
    severity: input.severity,
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId ?? null,
    procedure: "printProcessorWorker.processNextPrintJob",
    metadata: input.metadata,
  });
}

async function resolvePrintingFailure(input: {
  jobId: number;
  attemptId?: number;
  reason: string;
  restaurantId?: number;
}): Promise<void> {
  if (input.attemptId == null) {
    logProcessorEvent({
      type: OPS_EVENT.print_processor_execution_failed,
      severity: "warn",
      restaurantId: input.restaurantId,
      metadata: {
        jobId: input.jobId,
        reason: input.reason,
        lifecycleResolved: false,
      },
    });
    return;
  }

  try {
    await failPrintExecution({
      jobId: input.jobId,
      attemptId: input.attemptId,
      reason: input.reason,
    });
  } catch (error) {
    logProcessorEvent({
      type: OPS_EVENT.print_processor_execution_failed,
      severity: "warn",
      restaurantId: input.restaurantId,
      metadata: {
        jobId: input.jobId,
        attemptId: input.attemptId,
        reason: input.reason,
        lifecycleResolved: false,
        resolutionError: error instanceof Error ? error.message : String(error),
      },
    });
    return;
  }

  logProcessorEvent({
    type: OPS_EVENT.print_processor_execution_failed,
    severity: "warn",
    restaurantId: input.restaurantId,
    metadata: {
      jobId: input.jobId,
      attemptId: input.attemptId,
      reason: input.reason,
      lifecycleResolved: true,
    },
  });
}

/**
 * Claims, executes, and completes one queued print job when available.
 * Returns `{ processed: false }` when the queue is empty.
 */
export async function processNextPrintJob(
  input: ProcessNextPrintJobInput
): Promise<ProcessNextPrintJobResult> {
  assertValidWorkerInput(input);

  const claimed = await claimNextPrintJob({
    workerId: input.workerId,
    printerId: input.printerId,
  });
  if (!claimed) {
    return { processed: false };
  }

  logProcessorEvent({
    type: OPS_EVENT.print_processor_job_claimed,
    severity: "info",
    restaurantId: claimed.restaurantId,
    metadata: {
      jobId: claimed.id,
      workerId: input.workerId,
      orderId: claimed.orderId,
      printerId: claimed.printerId,
    },
  });

  let attemptId: number | undefined;

  try {
    const started = await startPrintExecution({ jobId: claimed.id });
    attemptId = started.attemptId;

    logProcessorEvent({
      type: OPS_EVENT.print_processor_execution_started,
      severity: "info",
      restaurantId: claimed.restaurantId,
      metadata: {
        jobId: claimed.id,
        attemptId: started.attemptId,
        workerId: input.workerId,
      },
    });

    const processorResult = await executePrintJob(started.job);
    if (!processorResult.success) {
      await resolvePrintingFailure({
        jobId: claimed.id,
        attemptId,
        reason: processorResult.error ?? "Print processor returned failure",
        restaurantId: claimed.restaurantId,
      });
      return { processed: true, jobId: claimed.id, result: "failed" };
    }

    await completePrintExecution({
      jobId: claimed.id,
      attemptId,
    });

    logProcessorEvent({
      type: OPS_EVENT.print_processor_execution_completed,
      severity: "info",
      restaurantId: claimed.restaurantId,
      metadata: {
        jobId: claimed.id,
        attemptId,
        workerId: input.workerId,
        result: "printed",
      },
    });

    return { processed: true, jobId: claimed.id, result: "printed" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await resolvePrintingFailure({
      jobId: claimed.id,
      attemptId,
      reason,
      restaurantId: claimed.restaurantId,
    });
    return { processed: true, jobId: claimed.id, result: "failed" };
  }
}

/**
 * THERMAL-PRINTING-3C.2 — execution lifecycle after claim (no physical I/O).
 */
import type { SelectPrintJobAttempt } from "../../drizzle/schema";
import {
  PRINT_JOB_ATTEMPT_EVENT,
  PRINT_JOB_STATUS,
  type PrintExecutionAttemptMetadata,
  type PrintJobStatus,
} from "../../shared/printing/types";
import { getDb } from "../db";
import {
  findPrintAttemptById,
  insertPrintAttempt,
  updatePrintAttemptMetadata,
} from "./printJobAttemptRepository";
import {
  findPrintJobById,
  markJobFailed,
  markJobPrinted,
  markJobPrinting,
} from "./printJobRepository";
import { canPrintJobTransition } from "./printJobTransitions";
import {
  formatPrintJobTimestamp,
  PrintJobExecutionError,
  PrintJobNotFoundError,
  PrintJobTransitionError,
  PrintJobUnavailableError,
  PrintJobValidationError,
  type CompletePrintExecutionInput,
  type FailPrintExecutionInput,
  type PrintExecutionResult,
  type StartPrintExecutionInput,
} from "./printJobTypes";

function assertPositiveJobId(jobId: number): void {
  if (!Number.isInteger(jobId) || jobId <= 0) {
    throw new PrintJobValidationError("Invalid jobId");
  }
}

function assertPositiveAttemptId(attemptId: number): void {
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    throw new PrintJobValidationError("Invalid attemptId");
  }
}

function parseAttemptMetadata(
  attempt: SelectPrintJobAttempt
): PrintExecutionAttemptMetadata {
  const metadata = attempt.metadataJson as PrintExecutionAttemptMetadata | null;
  if (!metadata?.startedAt || !metadata.status || !metadata.attemptNumber) {
    throw new PrintJobExecutionError("Print attempt metadata is invalid");
  }
  return metadata;
}

function assertJobStatus(job: { status: string }, expected: PrintJobStatus): void {
  if (job.status !== expected) {
    throw new PrintJobTransitionError(
      `Print job must be ${expected} (current: ${job.status})`
    );
  }
}

function assertClaimedJobReady(job: {
  status: string;
  claimedBy: number | null;
}): void {
  assertJobStatus(job, PRINT_JOB_STATUS.CLAIMED);
  if (job.claimedBy == null) {
    throw new PrintJobExecutionError("Print job is not claimed");
  }
}

export async function startPrintExecution(
  input: StartPrintExecutionInput
): Promise<PrintExecutionResult> {
  assertPositiveJobId(input.jobId);

  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }

  return db.transaction(async (tx) => {
    const existing = await findPrintJobById(input.jobId, tx);
    if (!existing) {
      throw new PrintJobNotFoundError();
    }

    assertClaimedJobReady(existing);
    if (
      !canPrintJobTransition(existing.status as PrintJobStatus, PRINT_JOB_STATUS.PRINTING)
    ) {
      throw new PrintJobTransitionError(
        `Invalid print job transition: ${existing.status} → ${PRINT_JOB_STATUS.PRINTING}`
      );
    }

    const startedAt = formatPrintJobTimestamp();
    const nextAttemptNumber = existing.attemptCount + 1;
    const attemptMetadata: PrintExecutionAttemptMetadata = {
      startedAt,
      status: PRINT_JOB_STATUS.PRINTING,
      attemptNumber: nextAttemptNumber,
    };

    const job = await markJobPrinting(input.jobId, tx);
    if (!job) {
      throw new PrintJobTransitionError("Unable to start print execution");
    }

    const attemptId = await insertPrintAttempt(
      {
        printJobId: input.jobId,
        eventType: PRINT_JOB_ATTEMPT_EVENT.EXECUTION_ATTEMPT,
        metadataJson: attemptMetadata,
      },
      tx
    );

    return { job, attemptId, attemptMetadata };
  });
}

export async function completePrintExecution(
  input: CompletePrintExecutionInput
): Promise<PrintExecutionResult> {
  assertPositiveJobId(input.jobId);
  assertPositiveAttemptId(input.attemptId);

  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }

  return db.transaction(async (tx) => {
    const job = await findPrintJobById(input.jobId, tx);
    if (!job) {
      throw new PrintJobNotFoundError();
    }

    assertJobStatus(job, PRINT_JOB_STATUS.PRINTING);
    if (!canPrintJobTransition(job.status as PrintJobStatus, PRINT_JOB_STATUS.PRINTED)) {
      throw new PrintJobTransitionError(
        `Invalid print job transition: ${job.status} → ${PRINT_JOB_STATUS.PRINTED}`
      );
    }

    const attempt = await findPrintAttemptById(input.attemptId, tx);
    if (!attempt || attempt.printJobId !== input.jobId) {
      throw new PrintJobNotFoundError("Print attempt not found");
    }

    const metadata = parseAttemptMetadata(attempt);
    if (metadata.completedAt) {
      throw new PrintJobExecutionError("Print attempt is already completed");
    }

    const updatedJob = await markJobPrinted(input.jobId, tx);
    if (!updatedJob) {
      throw new PrintJobTransitionError("Unable to complete print execution");
    }

    const completedMetadata: PrintExecutionAttemptMetadata = {
      ...metadata,
      completedAt: formatPrintJobTimestamp(),
      status: PRINT_JOB_STATUS.PRINTED,
    };
    await updatePrintAttemptMetadata(input.attemptId, completedMetadata, tx);

    return {
      job: updatedJob,
      attemptId: input.attemptId,
      attemptMetadata: completedMetadata,
    };
  });
}

export async function failPrintExecution(
  input: FailPrintExecutionInput
): Promise<PrintExecutionResult> {
  assertPositiveJobId(input.jobId);
  assertPositiveAttemptId(input.attemptId);

  const reason = input.reason?.trim();
  if (!reason) {
    throw new PrintJobValidationError("Failure reason is required");
  }

  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }

  return db.transaction(async (tx) => {
    const job = await findPrintJobById(input.jobId, tx);
    if (!job) {
      throw new PrintJobNotFoundError();
    }

    assertJobStatus(job, PRINT_JOB_STATUS.PRINTING);
    if (!canPrintJobTransition(job.status as PrintJobStatus, PRINT_JOB_STATUS.FAILED)) {
      throw new PrintJobTransitionError(
        `Invalid print job transition: ${job.status} → ${PRINT_JOB_STATUS.FAILED}`
      );
    }

    const attempt = await findPrintAttemptById(input.attemptId, tx);
    if (!attempt || attempt.printJobId !== input.jobId) {
      throw new PrintJobNotFoundError("Print attempt not found");
    }

    const metadata = parseAttemptMetadata(attempt);
    if (metadata.completedAt) {
      throw new PrintJobExecutionError("Print attempt is already completed");
    }

    const updatedJob = await markJobFailed(input.jobId, tx);
    if (!updatedJob) {
      throw new PrintJobTransitionError("Unable to fail print execution");
    }

    const failedMetadata: PrintExecutionAttemptMetadata = {
      ...metadata,
      completedAt: formatPrintJobTimestamp(),
      status: PRINT_JOB_STATUS.FAILED,
      error: reason,
    };
    await updatePrintAttemptMetadata(input.attemptId, failedMetadata, tx);

    return {
      job: updatedJob,
      attemptId: input.attemptId,
      attemptMetadata: failedMetadata,
    };
  });
}

/**
 * THERMAL-PRINTING-3C.1 — queue claiming (no render, dispatch, or attempts).
 */
import { getDb } from "../db";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { claimJob, findNextQueuedJob } from "./printJobRepository";
import {
  computePrintJobLeaseExpiresAt,
  PrintJobUnavailableError,
  PrintJobValidationError,
  type ClaimNextPrintJobInput,
} from "./printJobTypes";
import type { SelectPrintJob } from "../../drizzle/schema";

function assertValidClaimInput(input: ClaimNextPrintJobInput): void {
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

/**
 * Atomically claims the oldest eligible queued job for a worker.
 *
 * Printer filter: when `printerId` is supplied, jobs assigned to that printer
 * or still unassigned (`printerId IS NULL`) are eligible.
 *
 * Returns null when no eligible queued job exists (does not throw).
 */
export async function claimNextPrintJob(
  input: ClaimNextPrintJobInput
): Promise<SelectPrintJob | null> {
  assertValidClaimInput(input);

  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }

  return db.transaction(async (tx) => {
    const next = await findNextQueuedJob({ printerId: input.printerId }, tx);
    if (!next) {
      return null;
    }

    const leaseExpiresAt = computePrintJobLeaseExpiresAt();
    const claimed = await claimJob(
      {
        jobId: next.id,
        workerId: input.workerId,
        leaseExpiresAt,
      },
      tx
    );

    if (!claimed || claimed.status !== PRINT_JOB_STATUS.CLAIMED) {
      return null;
    }

    return claimed;
  });
}

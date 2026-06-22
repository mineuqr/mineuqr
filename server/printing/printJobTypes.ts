import type { SelectPrintJob } from "../../drizzle/schema";
import type {
  PrintExecutionAttemptMetadata,
  PrintJobTrigger,
} from "../../shared/printing/types";

export class PrintJobUnavailableError extends Error {
  constructor(message = "Database not available") {
    super(message);
    this.name = "PrintJobUnavailableError";
  }
}

export class PrintJobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintJobValidationError";
  }
}

export class PrintJobOrderNotFoundError extends Error {
  constructor(message = "Order not found") {
    super(message);
    this.name = "PrintJobOrderNotFoundError";
  }
}

export class PrintJobNotFoundError extends Error {
  constructor(message = "Print job not found") {
    super(message);
    this.name = "PrintJobNotFoundError";
  }
}

export class PrintJobTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintJobTransitionError";
  }
}

export class PrintJobExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintJobExecutionError";
  }
}

export function isMysqlDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; errno?: number };
  return e.code === "ER_DUP_ENTRY" || e.errno === 1062;
}

export type CreatePrintJobInput = {
  orderId: number;
  trigger: PrintJobTrigger;
  /** Required when trigger is `reprint`; must be a unique UUID per reprint attempt. */
  reprintId?: string;
  /** Required when trigger is `auto`. Optional override for `reprint`. */
  printerId?: number;
  /** THERMAL-PRINTING-12A — station scope for multi-target auto jobs. */
  stationId?: number | null;
  /** Optional explicit idempotency key (auto jobs with station routing). */
  idempotencyKey?: string;
};

export type CreatePrintJobResult = {
  job: SelectPrintJob;
  created: boolean;
};

export type InsertPrintJobData = {
  restaurantId: number;
  orderId: number;
  idempotencyKey: string;
  printerId?: number;
  stationId?: number | null;
};

export const PRINT_JOB_CLAIM_LEASE_MS = 5 * 60 * 1000;

/** Naive datetime for MySQL timestamp columns (`YYYY-MM-DD HH:mm:ss`). */
export function formatPrintJobTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function computePrintJobLeaseExpiresAt(now = new Date()): string {
  return formatPrintJobTimestamp(new Date(now.getTime() + PRINT_JOB_CLAIM_LEASE_MS));
}

export type FindNextQueuedJobFilter = {
  printerId?: number;
};

export type ClaimJobData = {
  jobId: number;
  workerId: number;
  leaseExpiresAt: string;
};

export type ClaimNextPrintJobInput = {
  workerId: number;
  printerId?: number;
};

export type StartPrintExecutionInput = {
  jobId: number;
};

export type CompletePrintExecutionInput = {
  jobId: number;
  attemptId: number;
};

export type FailPrintExecutionInput = {
  jobId: number;
  attemptId: number;
  reason: string;
};

export type PrintExecutionResult = {
  job: SelectPrintJob;
  attemptId: number;
  attemptMetadata: PrintExecutionAttemptMetadata;
};

export type ProcessNextPrintJobInput = {
  workerId: number;
  printerId?: number;
};

export type ProcessNextPrintJobResult =
  | { processed: false }
  | { processed: true; jobId: number; result: "printed" | "failed" };

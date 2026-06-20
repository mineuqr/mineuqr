import type { SelectPrintJob } from "../../drizzle/schema";
import type { PrintJobTrigger } from "../../shared/printing/types";

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
};

export type CreatePrintJobResult = {
  job: SelectPrintJob;
  created: boolean;
};

export type InsertPrintJobData = {
  restaurantId: number;
  orderId: number;
  idempotencyKey: string;
};

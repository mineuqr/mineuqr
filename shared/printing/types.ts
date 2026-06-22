/**
 * THERMAL-PRINTING-3B.1 — shared print domain types and enums.
 */

export const PAPER_WIDTH_MM = {
  W58: 58,
  W80: 80,
} as const;

export const PAPER_WIDTH_MM_VALUES = [PAPER_WIDTH_MM.W58, PAPER_WIDTH_MM.W80] as const;

export type PaperWidthMm = (typeof PAPER_WIDTH_MM_VALUES)[number];

export const PRINT_TICKET_LOCALE = {
  AR: "ar",
  EN: "en",
  BILINGUAL: "bilingual",
} as const;

export const PRINT_TICKET_LOCALE_VALUES = [
  PRINT_TICKET_LOCALE.AR,
  PRINT_TICKET_LOCALE.EN,
  PRINT_TICKET_LOCALE.BILINGUAL,
] as const;

export type PrintTicketLocale = (typeof PRINT_TICKET_LOCALE_VALUES)[number];

export const PRINT_JOB_STATUS = {
  QUEUED: "queued",
  CLAIMED: "claimed",
  PRINTING: "printing",
  PRINTED: "printed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export const PRINT_JOB_STATUS_VALUES = [
  PRINT_JOB_STATUS.QUEUED,
  PRINT_JOB_STATUS.CLAIMED,
  PRINT_JOB_STATUS.PRINTING,
  PRINT_JOB_STATUS.PRINTED,
  PRINT_JOB_STATUS.FAILED,
  PRINT_JOB_STATUS.CANCELLED,
  PRINT_JOB_STATUS.EXPIRED,
] as const;

export type PrintJobStatus = (typeof PRINT_JOB_STATUS_VALUES)[number];

/** Known attempt audit event types (extensible via varchar in DB). */
export const PRINT_JOB_ATTEMPT_EVENT = {
  EXECUTION_ATTEMPT: "execution_attempt",
  STATUS_TRANSITION: "status_transition",
  DELIVERY_FAILED: "delivery_failed",
  LEASE_EXPIRED: "lease_expired",
} as const;

export type PrintExecutionAttemptStatus = "printing" | "printed" | "failed";

export type PrintExecutionAttemptMetadata = {
  startedAt: string;
  completedAt?: string;
  status: PrintExecutionAttemptStatus;
  attemptNumber: number;
  error?: string;
};

export type PrintJobAttemptEventType =
  | (typeof PRINT_JOB_ATTEMPT_EVENT)[keyof typeof PRINT_JOB_ATTEMPT_EVENT]
  | string;

export const PRINT_JOB_TRIGGER = {
  AUTO: "auto",
  REPRINT: "reprint",
} as const;

export type PrintJobTrigger =
  (typeof PRINT_JOB_TRIGGER)[keyof typeof PRINT_JOB_TRIGGER];

/** Auto print on order submission — one job per order (legacy single-target). */
export function autoPrintJobIdempotencyKey(orderId: number): string {
  return `order:${orderId}:submitted`;
}

/** Auto print per station — one job per order per station (THERMAL-PRINTING-12A). */
export function autoPrintStationJobIdempotencyKey(
  orderId: number,
  stationId: number
): string {
  return `order:${orderId}:submitted:station:${stationId}`;
}

/** Auto print for unmapped categories routed to the default printer. */
export function autoPrintDefaultStationJobIdempotencyKey(orderId: number): string {
  return `order:${orderId}:submitted:default`;
}

/** Staff reprint — each UUID creates a distinct job. */
export function reprintPrintJobIdempotencyKey(
  orderId: number,
  reprintId: string
): string {
  return `order:${orderId}:reprint:${reprintId}`;
}

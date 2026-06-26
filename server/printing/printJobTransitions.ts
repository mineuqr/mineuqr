import { PRINT_JOB_STATUS, type PrintJobStatus } from "../../shared/printing/types";

/**
 * THERMAL-PRINTING-13I.3C.1 — legal execution lifecycle transitions.
 *
 * Agent-runtime path: queued → assigned → printing → printed | failed
 * Legacy dormant worker: queued → claimed → printing → printed | failed
 */
const ALLOWED_PRINT_JOB_TRANSITIONS: Record<PrintJobStatus, readonly PrintJobStatus[]> = {
  [PRINT_JOB_STATUS.QUEUED]: [PRINT_JOB_STATUS.ASSIGNED, PRINT_JOB_STATUS.CLAIMED],
  [PRINT_JOB_STATUS.ASSIGNED]: [PRINT_JOB_STATUS.PRINTING],
  [PRINT_JOB_STATUS.CLAIMED]: [PRINT_JOB_STATUS.PRINTING],
  [PRINT_JOB_STATUS.PRINTING]: [PRINT_JOB_STATUS.PRINTED, PRINT_JOB_STATUS.FAILED],
  [PRINT_JOB_STATUS.PRINTED]: [],
  [PRINT_JOB_STATUS.FAILED]: [],
  [PRINT_JOB_STATUS.CANCELLED]: [],
  [PRINT_JOB_STATUS.EXPIRED]: [],
};

export function assertPrintJobTransition(from: PrintJobStatus, to: PrintJobStatus): void {
  if (!ALLOWED_PRINT_JOB_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid print job transition: ${from} → ${to}`);
  }
}

export function canPrintJobTransition(from: PrintJobStatus, to: PrintJobStatus): boolean {
  return ALLOWED_PRINT_JOB_TRANSITIONS[from].includes(to);
}

export const TERMINAL_PRINT_JOB_STATUSES: readonly PrintJobStatus[] = [
  PRINT_JOB_STATUS.PRINTED,
  PRINT_JOB_STATUS.FAILED,
  PRINT_JOB_STATUS.CANCELLED,
  PRINT_JOB_STATUS.EXPIRED,
];

export function isTerminalPrintJobStatus(status: PrintJobStatus): boolean {
  return TERMINAL_PRINT_JOB_STATUSES.includes(status);
}

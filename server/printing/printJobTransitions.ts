import { PRINT_JOB_STATUS, type PrintJobStatus } from "../../shared/printing/types";

const ALLOWED_PRINT_JOB_TRANSITIONS: Record<PrintJobStatus, readonly PrintJobStatus[]> = {
  [PRINT_JOB_STATUS.QUEUED]: [],
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

import type { PrintFailureReason } from "./PrintFailureReason";

export type PrinterStatus = {
  printerId: string;
  isOnline: boolean;
  isReady: boolean;
  paperLow: boolean;
  paperOut: boolean;
  lastError?: PrintFailureReason | null;
  checkedAt: string;
};

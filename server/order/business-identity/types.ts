/** Operational display identity — outside the Order aggregate. */

export type BusinessIdentityAssignment = {
  businessDay: string;
  dailyDisplayNumber: number;
};

export type OrderDisplayIdentity = BusinessIdentityAssignment & {
  /** Padded daily number, e.g. "001". */
  displayOrderNumber: string;
  /** Formatted staff-facing reference, e.g. "001" or "2026-07-10-001". */
  displayReference: string;
};

export type DisplayReferenceFormat = "sequence" | "day-sequence" | "iso-day-sequence";

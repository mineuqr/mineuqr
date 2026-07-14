/** Operational display identity — outside the Order aggregate. */

import type { BusinessIdentityScope } from "./application/resolveBusinessIdentityScope";

export type { BusinessIdentityScope };

export type BusinessIdentityAssignment = {
  businessDay: string;
  dailyDisplayNumber: number;
  identityScope: BusinessIdentityScope;
};

export type OrderDisplayIdentity = BusinessIdentityAssignment & {
  /** Padded daily number, e.g. "001". */
  displayOrderNumber: string;
  /** Staff-facing reference, e.g. "T #001" / "K #001". */
  displayReference: string;
};

export type DisplayReferenceFormat = "sequence" | "day-sequence" | "iso-day-sequence";

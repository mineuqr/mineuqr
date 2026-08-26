/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 /
 * REGISTER-OPERATIONS-PRESENTATION-REPAIR-1 —
 * presentation workflow decisions. No Domain imports.
 */

import {
  isAuthoritativeCurrentShift,
  type CurrentShiftSnapshot,
} from "./financialShiftCurrentReconciliation";

export type RegisterDutyStatus = "closed" | "open" | "suspended";

/** Presentation/query-state only — not a domain status. */
export type CurrentShiftPresentationKind =
  | "unknown"
  | "error"
  | "none"
  | "active";

export function classifyCurrentShiftQuery(input: {
  queryEnabled: boolean;
  isPending: boolean;
  isError: boolean;
  data: CurrentShiftSnapshot | null | undefined;
}): CurrentShiftPresentationKind {
  if (!input.queryEnabled) return "unknown";
  if (input.isError) return "error";
  if (input.data === undefined) return "unknown";
  if (input.data === null) return "none";
  if (isAuthoritativeCurrentShift(input.data)) return "active";
  return "none";
}

/** Duty open and confirmed no current Financial Shift → collect opening float. */
export function needsOpeningFloatPrompt(input: {
  dutyStatus: RegisterDutyStatus | null | undefined;
  currentShiftKind: CurrentShiftPresentationKind;
}): boolean {
  if (input.dutyStatus !== "open") return false;
  return input.currentShiftKind === "none";
}

/** Close primary must run cash-count → Shift.close before Duty.close when Shift active. */
export function closeRequiresCashCount(input: {
  dutyStatus: RegisterDutyStatus | null | undefined;
  hasActiveFinancialShift: boolean;
}): boolean {
  return input.dutyStatus === "open" && input.hasActiveFinancialShift;
}

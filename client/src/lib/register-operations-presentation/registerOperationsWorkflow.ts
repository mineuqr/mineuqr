/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — presentation workflow decisions.
 * No Domain imports. Links Duty state to Shift prompts only.
 */

export type RegisterDutyStatus = "closed" | "open" | "suspended";

/** Duty open and no active Financial Shift → collect opening float. */
export function needsOpeningFloatPrompt(input: {
  dutyStatus: RegisterDutyStatus | null | undefined;
  hasActiveFinancialShift: boolean;
  currentLoaded: boolean;
}): boolean {
  if (!input.currentLoaded) return false;
  if (input.dutyStatus !== "open") return false;
  return !input.hasActiveFinancialShift;
}

/** Close primary must run cash-count → Shift.close before Duty.close when Shift active. */
export function closeRequiresCashCount(input: {
  dutyStatus: RegisterDutyStatus | null | undefined;
  hasActiveFinancialShift: boolean;
}): boolean {
  return input.dutyStatus === "open" && input.hasActiveFinancialShift;
}

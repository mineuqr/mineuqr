/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — eligibility / action visibility.
 * Presentation gating only — uses domain façade fields; no money math.
 */

export type RefundActionVisibilityInput = Readonly<{
  /** Current Settlement Record kind in the detail view. */
  recordKind: string;
  outcome: string;
  /** From checkRefund.getBudget — null while loading / unavailable. */
  budgetEligible: boolean | null;
}>;

/**
 * Refund action is available on a primary settlement publication when the
 * Check refund budget façade reports eligible.
 */
export function isRefundActionVisible(
  input: RefundActionVisibilityInput
): boolean {
  if (input.recordKind !== "settlement") return false;
  if (input.outcome !== "paid" && input.outcome !== "complimentary") {
    return false;
  }
  return input.budgetEligible === true;
}

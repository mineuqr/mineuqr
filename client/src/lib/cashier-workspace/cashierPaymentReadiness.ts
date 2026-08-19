/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1 / ADR-ARCH-038
 * Presentation-only payment readiness. Preview grandTotal is display/tender
 * planning only — not payable authority. Confirm MUST NOT require an open Check.
 */

import {
  canConfirmCashierSettlement,
  displayCents,
  resolveCashierSettlementPlan,
} from "./cashierSplitTender";

export function isAuthoritativePreviewGrandTotal(
  grandTotal: string | null | undefined
): boolean {
  if (grandTotal == null) return false;
  const trimmed = grandTotal.trim();
  if (trimmed.length === 0) return false;
  return /^\d+(?:\.\d{1,2})?$/.test(trimmed);
}

export type CashierPaymentReadinessInput = {
  /** Display-only preview (ticket / live restaurant tax). Not Check.grandTotal. */
  previewGrandTotal: string | null | undefined;
  /** Persisted cashier_pos sale (orderId) and payment sheet are ready. */
  saleReady: boolean;
  cashTender: string;
  cardTender: string;
  paymentSubmitting: boolean;
};

export type CashierPaymentReadiness = {
  canConfirmPayment: boolean;
  confirmDisabled: boolean;
  amountDue: string | null;
  remainingDisplay: string | null;
  totalTenderedDisplay: string | null;
};

export function resolveCashierPaymentReadiness(
  input: CashierPaymentReadinessInput
): CashierPaymentReadiness {
  const amountDue = isAuthoritativePreviewGrandTotal(input.previewGrandTotal)
    ? input.previewGrandTotal!.trim()
    : null;
  const tenderDraft =
    input.saleReady && amountDue != null
      ? {
          amountDue,
          cashTender: input.cashTender,
          cardTender: input.cardTender,
        }
      : null;
  const plan = tenderDraft ? resolveCashierSettlementPlan(tenderDraft) : null;
  const canConfirmPayment =
    tenderDraft != null && canConfirmCashierSettlement(tenderDraft);
  return {
    canConfirmPayment,
    confirmDisabled: input.paymentSubmitting || !canConfirmPayment,
    amountDue,
    remainingDisplay: plan ? displayCents(plan.remainingCents) : amountDue,
    totalTenderedDisplay: plan
      ? displayCents(plan.totalEnteredCents)
      : amountDue != null
        ? displayCents(0)
        : null,
  };
}

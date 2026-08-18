/**
 * CASHIER-PAYMENT-READINESS-STATE-HARDENING-1
 * Presentation-only Check / tender readiness. Check outstandingAmount is SSOT.
 * Does not settle, price, or invent payment methods.
 */

import {
  canConfirmCashierSettlement,
  displayCents,
  resolveCashierSettlementPlan,
} from "./cashierSplitTender";

export function isAuthoritativeCheckDueAvailable(
  outstandingAmount: string | null | undefined
): boolean {
  if (outstandingAmount == null) return false;
  const trimmed = outstandingAmount.trim();
  if (trimmed.length === 0) return false;
  return /^\d+(?:\.\d{1,2})?$/.test(trimmed);
}

export type CashierPaymentReadinessInput = {
  outstandingAmount: string | null | undefined;
  cashTender: string;
  cardTender: string;
  intakePending: boolean;
  intakeFailed: boolean;
  paymentSubmitting: boolean;
};

export type CashierPaymentReadiness = {
  checkAvailable: boolean;
  checkPreparing: boolean;
  checkIntakeFailed: boolean;
  canConfirmPayment: boolean;
  confirmDisabled: boolean;
  showPreparingMessage: boolean;
  amountDue: string | null;
  remainingDisplay: string | null;
  totalTenderedDisplay: string | null;
};

export function resolveCashierPaymentReadiness(
  input: CashierPaymentReadinessInput
): CashierPaymentReadiness {
  const amountDue = isAuthoritativeCheckDueAvailable(input.outstandingAmount)
    ? input.outstandingAmount!.trim()
    : null;
  const checkAvailable = amountDue != null;
  const checkIntakeFailed = input.intakeFailed && !checkAvailable && !input.intakePending;
  const checkPreparing = !checkAvailable && !checkIntakeFailed;
  const tenderDraft = checkAvailable
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
    checkAvailable,
    checkPreparing,
    checkIntakeFailed,
    canConfirmPayment,
    confirmDisabled:
      input.paymentSubmitting || !checkAvailable || !canConfirmPayment,
    showPreparingMessage: checkPreparing,
    amountDue,
    remainingDisplay: checkAvailable
      ? plan
        ? displayCents(plan.remainingCents)
        : amountDue
      : null,
    totalTenderedDisplay: checkAvailable
      ? displayCents(plan?.totalEnteredCents ?? 0)
      : null,
  };
}

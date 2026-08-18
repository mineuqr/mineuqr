/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1
 * Presentation-only payment readiness. Check.grandTotal is the payable amount.
 * Does not settle, price, or invent payment methods.
 */

import { CHECK_TERMINAL_OUTCOMES } from "@shared/operational-session";
import {
  canConfirmCashierSettlement,
  displayCents,
  resolveCashierSettlementPlan,
} from "./cashierSplitTender";

export function isAuthoritativeCheckGrandTotal(
  grandTotal: string | null | undefined
): boolean {
  if (grandTotal == null) return false;
  const trimmed = grandTotal.trim();
  if (trimmed.length === 0) return false;
  return /^\d+(?:\.\d{1,2})?$/.test(trimmed);
}

export type CashierPaymentReadinessInput = {
  checkGrandTotal: string | null | undefined;
  checkOutcome: string | null | undefined;
  cashTender: string;
  cardTender: string;
  intakePending: boolean;
  intakeFailed: boolean;
  paymentSubmitting: boolean;
  checkReadFailed?: boolean;
};

export type CashierPaymentReadiness = {
  checkAvailable: boolean;
  checkPreparing: boolean;
  checkIntakeFailed: boolean;
  checkReadFailed: boolean;
  checkTerminal: boolean;
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
  const amountDue = isAuthoritativeCheckGrandTotal(input.checkGrandTotal)
    ? input.checkGrandTotal!.trim()
    : null;
  const checkOpen = input.checkOutcome === "open";
  const checkTerminal =
    input.checkOutcome != null &&
    (CHECK_TERMINAL_OUTCOMES as readonly string[]).includes(input.checkOutcome);
  const checkAvailable = amountDue != null && checkOpen;
  const checkIntakeFailed =
    input.intakeFailed && !checkAvailable && !input.intakePending;
  const checkReadFailed =
    Boolean(input.checkReadFailed) && !checkAvailable && !input.intakePending;
  const checkPreparing =
    !checkAvailable &&
    !checkIntakeFailed &&
    !checkReadFailed &&
    !checkTerminal &&
    (input.checkOutcome == null ||
      input.checkOutcome === "" ||
      (checkOpen && amountDue == null));
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
    checkReadFailed,
    checkTerminal,
    canConfirmPayment,
    confirmDisabled:
      input.paymentSubmitting || !checkAvailable || !canConfirmPayment,
    showPreparingMessage: checkPreparing,
    amountDue: checkAvailable ? amountDue : null,
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

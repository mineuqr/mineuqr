/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — pure money + conservation.
 * Deterministic 2-decimal restaurant money. No I/O.
 */

import type { CheckFinancialResponsibility, SplitPayment, Tender } from "./splitPaymentContract";
import {
  AllocationExceededError,
  FinancialConservationViolationError,
  InvalidMoneyAmountError,
  OutstandingNegativeError,
  PaymentExceedsOutstandingError,
  TenderMismatchError,
} from "./splitPaymentErrors";

const MONEY_EPS = 0.001;

export function parseSplitPaymentMoney(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new InvalidMoneyAmountError(`Invalid money amount: ${value}`);
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatSplitPaymentMoney(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidMoneyAmountError(`Invalid money number: ${value}`);
  }
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function moneyEquals(a: string, b: string): boolean {
  return (
    Math.abs(parseSplitPaymentMoney(a) - parseSplitPaymentMoney(b)) <= MONEY_EPS
  );
}

export function moneyAdd(a: string, b: string): string {
  return formatSplitPaymentMoney(
    parseSplitPaymentMoney(a) + parseSplitPaymentMoney(b)
  );
}

export function moneySub(a: string, b: string): string {
  const result = parseSplitPaymentMoney(a) - parseSplitPaymentMoney(b);
  if (result < -MONEY_EPS) {
    throw new OutstandingNegativeError(
      `Subtraction would go negative: ${a} - ${b}`
    );
  }
  return formatSplitPaymentMoney(Math.max(0, result));
}

/** Remaining Balance = Financial Responsibility − Applied Payment Value */
export function calculateOutstandingBalance(
  financialResponsibility: string,
  appliedPaymentValue: string
): string {
  return moneySub(financialResponsibility, appliedPaymentValue);
}

export function buildCheckFinancialResponsibility(input: {
  restaurantId: number;
  checkId: number;
  financialResponsibility: string;
  appliedPaymentValue: string;
}): CheckFinancialResponsibility {
  const financialResponsibility = formatSplitPaymentMoney(
    parseSplitPaymentMoney(input.financialResponsibility)
  );
  const appliedPaymentValue = formatSplitPaymentMoney(
    parseSplitPaymentMoney(input.appliedPaymentValue)
  );
  const outstandingBalance = calculateOutstandingBalance(
    financialResponsibility,
    appliedPaymentValue
  );
  return {
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    financialResponsibility,
    appliedPaymentValue,
    outstandingBalance,
  };
}

/** I-SP-01 — Allocated + Outstanding = Financial Responsibility (Check scope). */
export function assertCheckConservation(
  responsibility: CheckFinancialResponsibility
): void {
  const allocated = parseSplitPaymentMoney(responsibility.appliedPaymentValue);
  const outstanding = parseSplitPaymentMoney(responsibility.outstandingBalance);
  const total = parseSplitPaymentMoney(responsibility.financialResponsibility);
  if (Math.abs(allocated + outstanding - total) > MONEY_EPS) {
    throw new FinancialConservationViolationError(
      `I-SP-01 violated: applied(${responsibility.appliedPaymentValue}) + outstanding(${responsibility.outstandingBalance}) != responsibility(${responsibility.financialResponsibility})`
    );
  }
  if (outstanding < -MONEY_EPS) {
    throw new OutstandingNegativeError("Outstanding balance is negative");
  }
}

export function sumTenderAmounts(tenders: readonly Tender[]): string {
  let sum = 0;
  for (const t of tenders) {
    sum += parseSplitPaymentMoney(t.amount);
  }
  return formatSplitPaymentMoney(sum);
}

/** Tender totals must equal Payment amount when tenders are present. */
export function assertTenderTotalsMatchPayment(
  paymentAmount: string,
  tenders: readonly Tender[]
): void {
  if (tenders.length === 0) return;
  const tenderTotal = sumTenderAmounts(tenders);
  if (!moneyEquals(tenderTotal, paymentAmount)) {
    throw new TenderMismatchError(
      `Tender total ${tenderTotal} does not equal payment amount ${paymentAmount}`
    );
  }
}

export function assertAllocationWithinPayment(
  paymentAmount: string,
  currentAllocated: string,
  additionalAllocation: string
): void {
  const next =
    parseSplitPaymentMoney(currentAllocated) +
    parseSplitPaymentMoney(additionalAllocation);
  if (next - parseSplitPaymentMoney(paymentAmount) > MONEY_EPS) {
    throw new AllocationExceededError(
      `Allocation would exceed payment: allocated=${currentAllocated} + ${additionalAllocation} > ${paymentAmount}`
    );
  }
}

export function assertPaymentWithinOutstanding(
  paymentAmount: string,
  outstandingBalance: string
): void {
  if (
    parseSplitPaymentMoney(paymentAmount) -
      parseSplitPaymentMoney(outstandingBalance) >
    MONEY_EPS
  ) {
    throw new PaymentExceedsOutstandingError(
      `Payment ${paymentAmount} exceeds outstanding ${outstandingBalance}`
    );
  }
}

export function computeUnallocated(
  paymentAmount: string,
  allocatedAmount: string
): string {
  return moneySub(paymentAmount, allocatedAmount);
}

export function assertPaymentMoneyAlgebra(payment: SplitPayment): void {
  const expected = computeUnallocated(payment.amount, payment.allocatedAmount);
  if (!moneyEquals(expected, payment.unallocatedAmount)) {
    throw new FinancialConservationViolationError(
      `Payment algebra: unallocated ${payment.unallocatedAmount} != amount-allocated ${expected}`
    );
  }
  assertTenderTotalsMatchPayment(payment.amount, payment.tenders);
}

/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — pure money calculations.
 * Deterministic 2-decimal restaurant money. No I/O.
 */

import type { OrderSettlementMoneyAmounts } from "./orderSettlementContract";
import {
  AllocationValidationFailedError,
  CoverageValidationFailedError,
  InvalidMoneyAmountError,
  OutstandingAmountMismatchError,
  SettlementOverflowError,
} from "./orderSettlementErrors";

const MONEY_EPS = 0.001;

export function parseOrderSettlementMoney(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new InvalidMoneyAmountError(`Invalid money amount: ${value}`);
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatOrderSettlementMoney(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidMoneyAmountError(`Invalid money number: ${value}`);
  }
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function moneyEquals(a: string, b: string): boolean {
  return Math.abs(parseOrderSettlementMoney(a) - parseOrderSettlementMoney(b)) <= MONEY_EPS;
}

/** outstanding = orderTotalSnapshot − settledAmount */
export function calculateOutstandingAmount(
  orderTotalSnapshot: string,
  settledAmount: string
): string {
  const total = parseOrderSettlementMoney(orderTotalSnapshot);
  const settled = parseOrderSettlementMoney(settledAmount);
  if (settled - total > MONEY_EPS) {
    throw new SettlementOverflowError(
      `settledAmount ${settledAmount} exceeds orderTotalSnapshot ${orderTotalSnapshot}`
    );
  }
  return formatOrderSettlementMoney(Math.max(0, total - settled));
}

export function buildMoneyAmounts(input: {
  orderTotalSnapshot: string;
  settledAmount: string;
  allocatedAmount?: string;
}): OrderSettlementMoneyAmounts {
  const orderTotalSnapshot = formatOrderSettlementMoney(
    parseOrderSettlementMoney(input.orderTotalSnapshot)
  );
  const settledAmount = formatOrderSettlementMoney(
    parseOrderSettlementMoney(input.settledAmount)
  );
  const outstandingAmount = calculateOutstandingAmount(
    orderTotalSnapshot,
    settledAmount
  );
  const allocatedAmount = formatOrderSettlementMoney(
    parseOrderSettlementMoney(input.allocatedAmount ?? orderTotalSnapshot)
  );
  return {
    orderTotalSnapshot,
    allocatedAmount,
    settledAmount,
    outstandingAmount,
  };
}

/** I-OS-03 — settled + outstanding = orderTotalSnapshot */
export function assertOutstandingAlgebra(amounts: OrderSettlementMoneyAmounts): void {
  const total = parseOrderSettlementMoney(amounts.orderTotalSnapshot);
  const settled = parseOrderSettlementMoney(amounts.settledAmount);
  const outstanding = parseOrderSettlementMoney(amounts.outstandingAmount);
  if (Math.abs(settled + outstanding - total) > MONEY_EPS) {
    throw new OutstandingAmountMismatchError(
      `settledAmount (${amounts.settledAmount}) + outstandingAmount (${amounts.outstandingAmount}) must equal orderTotalSnapshot (${amounts.orderTotalSnapshot})`
    );
  }
}

/** I-OS-04 */
export function assertNoSettlementOverflow(amounts: OrderSettlementMoneyAmounts): void {
  const total = parseOrderSettlementMoney(amounts.orderTotalSnapshot);
  const settled = parseOrderSettlementMoney(amounts.settledAmount);
  if (settled - total > MONEY_EPS) {
    throw new SettlementOverflowError(
      `settledAmount ${amounts.settledAmount} exceeds orderTotalSnapshot ${amounts.orderTotalSnapshot}`
    );
  }
}

/** Allocation must not exceed order total (v1: typically equal while pending). */
export function assertAllocationValid(amounts: OrderSettlementMoneyAmounts): void {
  const total = parseOrderSettlementMoney(amounts.orderTotalSnapshot);
  const allocated = parseOrderSettlementMoney(amounts.allocatedAmount);
  if (allocated - total > MONEY_EPS) {
    throw new AllocationValidationFailedError(
      `allocatedAmount ${amounts.allocatedAmount} exceeds orderTotalSnapshot ${amounts.orderTotalSnapshot}`
    );
  }
}

export function isFullySettled(amounts: OrderSettlementMoneyAmounts): boolean {
  return parseOrderSettlementMoney(amounts.outstandingAmount) <= MONEY_EPS;
}

export function isPartiallySettled(amounts: OrderSettlementMoneyAmounts): boolean {
  const settled = parseOrderSettlementMoney(amounts.settledAmount);
  const outstanding = parseOrderSettlementMoney(amounts.outstandingAmount);
  return settled > MONEY_EPS && outstanding > MONEY_EPS;
}

export function assertCoverageAmount(
  orderTotalSnapshot: string,
  coverageAmount: string,
  options?: { allowPartial?: boolean }
): string {
  const total = parseOrderSettlementMoney(orderTotalSnapshot);
  const cover = parseOrderSettlementMoney(coverageAmount);
  if (cover <= MONEY_EPS) {
    throw new CoverageValidationFailedError(
      `Coverage amount must be positive: ${coverageAmount}`
    );
  }
  if (cover - total > MONEY_EPS) {
    throw new SettlementOverflowError(
      `Coverage ${coverageAmount} exceeds orderTotalSnapshot ${orderTotalSnapshot}`
    );
  }
  if (!options?.allowPartial && Math.abs(cover - total) > MONEY_EPS) {
    throw new CoverageValidationFailedError(
      `Full coverage required: ${coverageAmount} != ${orderTotalSnapshot}`
    );
  }
  return formatOrderSettlementMoney(cover);
}

/**
 * I-OS-05 — sum of active OS orderTotalSnapshot reconciles to Check orders subtotal
 * (before bill discount), within 2-decimal rounding.
 */
export function assertSnapshotsReconcileToOrdersSubtotal(
  snapshots: readonly string[],
  ordersSubtotal: string
): void {
  let sum = 0;
  for (const s of snapshots) {
    sum += parseOrderSettlementMoney(s);
  }
  const expected = parseOrderSettlementMoney(ordersSubtotal);
  if (Math.abs(sum - expected) > MONEY_EPS) {
    throw new AllocationValidationFailedError(
      `Sum of OrderSettlement snapshots ${formatOrderSettlementMoney(sum)} must equal orders subtotal ${formatOrderSettlementMoney(expected)}`
    );
  }
}

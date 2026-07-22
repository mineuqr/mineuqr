/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — pure money + conservation.
 * Deterministic 2-decimal restaurant money. No I/O.
 *
 * I-MCA-01: Allocated Value + Remaining Value = Financial Responsibility
 */

import type {
  AllocationAdjustment,
  AllocationPortion,
  MultiCheckAllocation,
} from "./multiCheckAllocationContract";
import {
  AllocationExceededError,
  FinancialConservationViolationError,
  InvalidMoneyAmountError,
  NegativeResponsibilityError,
  PaymentValueExceededError,
} from "./multiCheckAllocationErrors";

const MONEY_EPS = 0.001;

export function parseAllocationMoney(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new InvalidMoneyAmountError(`Invalid money amount: ${value}`);
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatAllocationMoney(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidMoneyAmountError(`Invalid money number: ${value}`);
  }
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function moneyEquals(a: string, b: string): boolean {
  return (
    Math.abs(parseAllocationMoney(a) - parseAllocationMoney(b)) <= MONEY_EPS
  );
}

export function moneyAdd(a: string, b: string): string {
  return formatAllocationMoney(parseAllocationMoney(a) + parseAllocationMoney(b));
}

export function moneySub(a: string, b: string): string {
  const result = parseAllocationMoney(a) - parseAllocationMoney(b);
  if (result < -MONEY_EPS) {
    throw new NegativeResponsibilityError(
      `Subtraction would go negative: ${a} - ${b}`
    );
  }
  return formatAllocationMoney(Math.max(0, result));
}

export function sumPortionAmounts(
  portions: readonly AllocationPortion[]
): string {
  let sum = 0;
  for (const p of portions) {
    sum += parseAllocationMoney(p.amount);
  }
  return formatAllocationMoney(sum);
}

/** Net adjustment: increase adds to allocated; decrease subtracts. */
export function netAdjustmentAmount(
  adjustments: readonly AllocationAdjustment[]
): number {
  let net = 0;
  for (const a of adjustments) {
    const amt = parseAllocationMoney(a.amount);
    net += a.direction === "increase" ? amt : -amt;
  }
  return Math.round((net + Number.EPSILON) * 100) / 100;
}

/**
 * Applied allocated value = sum(applied portions) + net adjustments.
 * Reversed allocations treat allocated as 0 for remaining restoration.
 */
export function computeAllocatedAmount(
  allocation: Pick<
    MultiCheckAllocation,
    "portions" | "adjustments" | "status" | "reversals"
  >
): string {
  if (allocation.status === "reversed" || allocation.status === "cancelled") {
    return formatAllocationMoney(0);
  }
  let sum = 0;
  for (const p of allocation.portions) {
    if (p.applied) sum += parseAllocationMoney(p.amount);
  }
  sum += netAdjustmentAmount(allocation.adjustments);
  if (sum < -MONEY_EPS) {
    throw new NegativeResponsibilityError(
      "Allocated amount would be negative after adjustments"
    );
  }
  return formatAllocationMoney(Math.max(0, sum));
}

export function computeRemainingAmount(
  financialResponsibility: string,
  allocatedAmount: string
): string {
  return moneySub(financialResponsibility, allocatedAmount);
}

/** I-MCA-01 — Allocated + Remaining = Financial Responsibility. */
export function assertAllocationConservation(
  allocation: Pick<
    MultiCheckAllocation,
    "financialResponsibility" | "allocatedAmount" | "remainingAmount" | "status"
  >
): void {
  if (
    allocation.status === "reversed" ||
    allocation.status === "cancelled"
  ) {
    // After reverse/cancel, remaining restores to full responsibility; allocated = 0.
    if (!moneyEquals(allocation.allocatedAmount, "0.00")) {
      throw new FinancialConservationViolationError(
        `I-MCA-01: ${allocation.status} Allocation must have allocatedAmount 0.00`
      );
    }
    if (
      !moneyEquals(
        allocation.remainingAmount,
        allocation.financialResponsibility
      )
    ) {
      throw new FinancialConservationViolationError(
        `I-MCA-01: ${allocation.status} Allocation remaining must equal financialResponsibility`
      );
    }
    return;
  }

  const allocated = parseAllocationMoney(allocation.allocatedAmount);
  const remaining = parseAllocationMoney(allocation.remainingAmount);
  const total = parseAllocationMoney(allocation.financialResponsibility);
  if (Math.abs(allocated + remaining - total) > MONEY_EPS) {
    throw new FinancialConservationViolationError(
      `I-MCA-01 violated: allocated(${allocation.allocatedAmount}) + remaining(${allocation.remainingAmount}) != responsibility(${allocation.financialResponsibility})`
    );
  }
  if (remaining < -MONEY_EPS || allocated < -MONEY_EPS) {
    throw new NegativeResponsibilityError(
      "Responsibility components must never be negative"
    );
  }
}

/** I-MCA-02 — portion plan ≤ financial responsibility. */
export function assertPortionsWithinResponsibility(
  financialResponsibility: string,
  portions: readonly AllocationPortion[]
): void {
  const portionTotal = sumPortionAmounts(portions);
  if (
    parseAllocationMoney(portionTotal) -
      parseAllocationMoney(financialResponsibility) >
    MONEY_EPS
  ) {
    throw new AllocationExceededError(
      `I-MCA-02: portion total ${portionTotal} exceeds responsibility ${financialResponsibility}`
    );
  }
}

/** I-MCA-03 — allocated / planned never exceeds bound Payment value. */
export function assertWithinPaymentValueCap(
  paymentValueCap: string | null,
  amount: string
): void {
  if (paymentValueCap == null) return;
  if (
    parseAllocationMoney(amount) - parseAllocationMoney(paymentValueCap) >
    MONEY_EPS
  ) {
    throw new PaymentValueExceededError(
      `I-MCA-03: amount ${amount} exceeds payment value cap ${paymentValueCap}`
    );
  }
}

/**
 * Cross-Allocation set conservation (Many-to-Many / Many-to-One sets).
 * Sum of designated source responsibility = sum of portion amounts + unallocated remainders.
 */
export function assertAllocationSetConservation(
  allocations: readonly Pick<
    MultiCheckAllocation,
    | "financialResponsibility"
    | "allocatedAmount"
    | "remainingAmount"
    | "status"
  >[]
): void {
  for (const a of allocations) {
    assertAllocationConservation(a);
  }
}

export function buildResponsibilitySnapshot(input: {
  restaurantId: number;
  allocationId: string;
  financialResponsibility: string;
  allocatedAmount: string;
}): {
  restaurantId: number;
  allocationId: string;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
} {
  const financialResponsibility = formatAllocationMoney(
    parseAllocationMoney(input.financialResponsibility)
  );
  const allocatedAmount = formatAllocationMoney(
    parseAllocationMoney(input.allocatedAmount)
  );
  const remainingAmount = computeRemainingAmount(
    financialResponsibility,
    allocatedAmount
  );
  return {
    restaurantId: input.restaurantId,
    allocationId: input.allocationId,
    financialResponsibility,
    allocatedAmount,
    remainingAmount,
  };
}

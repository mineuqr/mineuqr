/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — mandatory invariants.
 */

import type { Refund, RefundAllocation } from "./refundContract";
import {
  AlreadyRefundedError,
  CheckNotRefundableError,
  RefundAllocationOverflowError,
  RefundBudgetExceededError,
  RefundInvariantViolationError,
} from "./refundErrors";
import { assertRefundId, assertRefundReference } from "./refundIdentity";
import {
  assertPositiveRefundAmount,
  parseRefundMoney,
  refundMoneyAdd,
  refundMoneyLessOrEqual,
} from "./refundMoney";

export function assertRefundValid(refund: Refund): void {
  assertRefundId(refund.refundId);
  assertRefundReference(refund.refundReference);
  assertPositiveRefundAmount(refund.amount);
  if (!Number.isInteger(refund.restaurantId) || refund.restaurantId <= 0) {
    throw new RefundInvariantViolationError(
      "restaurantId required",
      "RF-INV-TEN01"
    );
  }
  if (!Number.isInteger(refund.checkId) || refund.checkId <= 0) {
    throw new RefundInvariantViolationError("checkId required", "RF-INV-TEN01");
  }
  if (!refund.referenceLink.priorSettlementRecordId) {
    throw new RefundInvariantViolationError(
      "RF-INV-P02: priorSettlementRecordId required",
      "RF-INV-P02"
    );
  }
  assertAllocationsWithinRefund(refund.amount, refund.allocations);
  if (
    refund.reverseSnapshot.grandTotal !== refund.amount &&
    parseRefundMoney(refund.reverseSnapshot.grandTotal) !==
      parseRefundMoney(refund.amount)
  ) {
    throw new RefundInvariantViolationError(
      `RF-INV-P03: reverseSnapshot.grandTotal ${refund.reverseSnapshot.grandTotal} != refund amount ${refund.amount}`,
      "RF-INV-P03"
    );
  }
}

export function assertAllocationsWithinRefund(
  refundAmount: string,
  allocations: readonly RefundAllocation[]
): void {
  if (allocations.length === 0) return;
  let sum = "0.00";
  for (const allocation of allocations) {
    assertPositiveRefundAmount(allocation.amount);
    sum = refundMoneyAdd(sum, allocation.amount);
  }
  if (!refundMoneyLessOrEqual(sum, refundAmount)) {
    throw new RefundAllocationOverflowError(
      `RF-INV-F02 / I-FC-05: Sum(allocations)=${sum} > Refund amount=${refundAmount}`
    );
  }
}

export function assertRefundWithinBudget(input: {
  amount: string;
  refundableBalance: string;
}): void {
  assertPositiveRefundAmount(input.amount);
  if (!refundMoneyLessOrEqual(input.amount, input.refundableBalance)) {
    if (parseRefundMoney(input.refundableBalance) <= 0) {
      throw new AlreadyRefundedError(
        `RF-BUDGET-01: no refundable balance remains (requested ${input.amount})`
      );
    }
    throw new RefundBudgetExceededError(
      `RF-BUDGET-01: Refund ${input.amount} exceeds refundable balance ${input.refundableBalance}`
    );
  }
}

export function assertCheckOutcomeRefundable(outcome: string): void {
  if (outcome !== "paid" && outcome !== "complimentary") {
    throw new CheckNotRefundableError(
      `RF-LAW-06: Check outcome ${outcome} is not refundable (requires paid|complimentary finalization)`
    );
  }
}

export function assertNotReopenCheck(outcome: string): void {
  if (outcome === "open") {
    throw new RefundInvariantViolationError(
      "RF-LAW-08: Refund must not reopen Check to open",
      "RF-LAW-08"
    );
  }
}

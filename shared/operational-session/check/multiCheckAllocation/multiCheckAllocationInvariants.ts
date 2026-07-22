/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — invariant enforcement (pure).
 *
 * I-MCA-01 … I-MCA-16 + Finality + Identity stability.
 * Domain receives facts as inputs — no repository / DB access.
 * Allocation never mutates Order Settlement directly.
 */

import type { MultiCheckAllocation } from "./multiCheckAllocationContract";
import {
  DuplicateIdentityError,
  FinalityViolationError,
  InvalidAllocationStateError,
} from "./multiCheckAllocationErrors";
import {
  assertAllocationId,
  assertAllocationReference,
  assertCheckId,
  assertFinancialReference,
  assertIdentityUnchanged,
  assertMultiCheckAllocationIdentity,
  assertSourcePaymentId,
  assertTenantMatch,
  assertUniquePortionIds,
  assertUniqueSequences,
} from "./multiCheckAllocationIdentity";
import { assertTransitionAllowed } from "./multiCheckAllocationLifecycle";
import {
  assertAllocationConservation,
  assertPortionsWithinResponsibility,
  assertWithinPaymentValueCap,
  parseAllocationMoney,
  sumPortionAmounts,
} from "./multiCheckAllocationMoney";

export function assertAllocationValid(allocation: MultiCheckAllocation): void {
  assertMultiCheckAllocationIdentity({
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
  });
  assertAllocationReference(allocation.allocationReference);
  assertFinancialReference(allocation.financialReference);
  assertSourcePaymentId(allocation.sourcePaymentId);
  assertCheckId("SourceCheckId", allocation.sourceCheckId);

  if (allocation.impliesCheckSettlement !== false) {
    throw new FinalityViolationError(
      "I-MCA-09: MultiCheckAllocation.impliesCheckSettlement must always be false"
    );
  }
  if (allocation.impliesPaymentCompletion !== false) {
    throw new FinalityViolationError(
      "I-MCA-10: MultiCheckAllocation.impliesPaymentCompletion must always be false"
    );
  }

  if (parseAllocationMoney(allocation.financialResponsibility) <= 0) {
    throw new InvalidAllocationStateError(
      "Financial responsibility must be > 0"
    );
  }

  if (allocation.portions.length === 0) {
    throw new InvalidAllocationStateError(
      "Allocation must have at least one Portion"
    );
  }

  assertUniquePortionIds(allocation.portions.map((p) => p.portionId));
  assertUniqueSequences(allocation.portions.map((p) => p.sequence));

  for (const p of allocation.portions) {
    if (p.allocationId !== allocation.allocationId) {
      throw new InvalidAllocationStateError(
        `Portion ${p.portionId} allocationId mismatch`
      );
    }
    assertCheckId("TargetCheckId", p.targetCheckId);
    if (parseAllocationMoney(p.amount) <= 0) {
      throw new InvalidAllocationStateError(
        `Portion ${p.portionId} amount must be > 0`
      );
    }
  }

  if (allocation.sources.length === 0) {
    throw new InvalidAllocationStateError(
      "Allocation must have at least one Source"
    );
  }

  for (const s of allocation.sources) {
    assertCheckId("SourceCheckId", s.sourceCheckId);
    assertSourcePaymentId(s.sourcePaymentId);
    assertFinancialReference(s.financialReference);
  }

  assertPortionsWithinResponsibility(
    allocation.financialResponsibility,
    allocation.portions
  );
  assertWithinPaymentValueCap(
    allocation.paymentValueCap,
    sumPortionAmounts(allocation.portions)
  );
  assertWithinPaymentValueCap(
    allocation.paymentValueCap,
    allocation.allocatedAmount
  );

  assertAllocationConservation(allocation);

  if (
    allocation.status === "completed" &&
    parseAllocationMoney(allocation.remainingAmount) > 0.001
  ) {
    // Completed may allow remaining > 0 only if domain treats scope as fully
    // redistributed for declared portions; DOMAIN-1 requires remaining = 0.
    throw new InvalidAllocationStateError(
      "Completed Allocation must have zero remaining amount"
    );
  }

  if (
    (allocation.status === "applied" ||
      allocation.status === "adjusted" ||
      allocation.status === "completed") &&
    allocation.portions.some((p) => !p.applied)
  ) {
    throw new InvalidAllocationStateError(
      "Applied/Adjusted/Completed Allocation must have all Portions applied"
    );
  }
}

/**
 * I-MCA-09 / I-MCA-10 — Allocation Completion ≠ Check settle ≠ Payment Completion.
 */
export function assertAllocationFinality(
  allocation: MultiCheckAllocation
): void {
  if (allocation.impliesCheckSettlement !== false) {
    throw new FinalityViolationError(
      "I-MCA-09: Allocation must never imply Check Financial Settlement"
    );
  }
  if (allocation.impliesPaymentCompletion !== false) {
    throw new FinalityViolationError(
      "I-MCA-10: Allocation must never imply Payment Completion"
    );
  }
}

export function assertAllocationIdentityStable(
  before: MultiCheckAllocation,
  after: MultiCheckAllocation
): void {
  assertIdentityUnchanged(before, after);
}

export function assertNoTerminalRegression(
  from: MultiCheckAllocation["status"],
  to: MultiCheckAllocation["status"]
): void {
  assertTransitionAllowed(from, to);
}

export function assertCreateInputs(input: {
  restaurantId: number;
  checkRestaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference?: string | null;
  sourceCheckId: number;
  sourcePaymentId?: string | null;
  financialResponsibility: string;
  paymentValueCap?: string | null;
  portions: readonly {
    portionId: string;
    sequence: number;
    targetCheckId: number;
    amount: string;
  }[];
  sources?: readonly {
    sourceCheckId: number;
    sourcePaymentId?: string | null;
    financialReference?: string | null;
    responsibilityAmount: string;
  }[];
  existingAllocationIds?: readonly string[];
}): void {
  assertAllocationId(input.allocationId);
  assertAllocationReference(input.allocationReference);
  assertFinancialReference(input.financialReference);
  assertSourcePaymentId(input.sourcePaymentId);
  assertCheckId("SourceCheckId", input.sourceCheckId);
  assertTenantMatch({
    allocationRestaurantId: input.restaurantId,
    checkRestaurantId: input.checkRestaurantId,
  });

  if (input.existingAllocationIds?.includes(input.allocationId)) {
    throw new DuplicateIdentityError(
      `AllocationId already exists: ${input.allocationId}`
    );
  }

  if (input.portions.length === 0) {
    throw new InvalidAllocationStateError(
      "Create requires at least one Portion"
    );
  }

  assertUniquePortionIds(input.portions.map((p) => p.portionId));
  assertUniqueSequences(input.portions.map((p) => p.sequence));
}

export function assertMultiCheckAllocationValid(
  allocation: MultiCheckAllocation
): void {
  assertAllocationValid(allocation);
  assertAllocationFinality(allocation);
}

/** I-MCA-01 money algebra. */
export function assertMoneyAlgebra(allocation: MultiCheckAllocation): void {
  assertAllocationConservation(allocation);
}

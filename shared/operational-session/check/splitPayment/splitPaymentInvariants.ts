/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — invariant enforcement (pure).
 *
 * I-SP-01 … I-SP-08 + Payment Finality + Identity stability.
 * Domain receives facts as inputs — no repository / DB access.
 */

import type {
  CheckFinancialResponsibility,
  PaymentAllocation,
  SplitPayment,
  Tender,
} from "./splitPaymentContract";
import { isSplitPaymentTerminalStatus } from "./splitPaymentContract";
import {
  FinalityViolationError,
  InvalidPaymentStateError,
  SplitPaymentDomainError,
} from "./splitPaymentErrors";
import {
  assertIdentityUnchanged,
  assertPaymentId,
  assertPaymentReference,
  assertFinancialReference,
  assertSplitPaymentIdentity,
  assertTenantMatch,
} from "./splitPaymentIdentity";
import { assertTransitionAllowed } from "./splitPaymentLifecycle";
import {
  assertCheckConservation,
  assertPaymentMoneyAlgebra,
  assertPaymentWithinOutstanding,
  assertTenderTotalsMatchPayment,
  parseSplitPaymentMoney,
} from "./splitPaymentMoney";

export function assertPaymentValid(payment: SplitPayment): void {
  assertSplitPaymentIdentity({
    restaurantId: payment.restaurantId,
    checkId: payment.checkId,
    paymentId: payment.paymentId,
  });
  assertPaymentReference(payment.paymentReference);
  assertFinancialReference(payment.financialReference);

  if (payment.impliesFinancialSettlement !== false) {
    throw new FinalityViolationError(
      "I-SP-06: SplitPayment.impliesFinancialSettlement must always be false"
    );
  }

  if (parseSplitPaymentMoney(payment.amount) <= 0) {
    throw new InvalidPaymentStateError("Payment amount must be > 0");
  }

  assertPaymentMoneyAlgebra(payment);

  for (const t of payment.tenders) {
    if (t.paymentId !== payment.paymentId) {
      throw new InvalidPaymentStateError(
        `Tender ${t.tenderId} paymentId mismatch`
      );
    }
    if (t.checkId !== payment.checkId || t.restaurantId !== payment.restaurantId) {
      throw new InvalidPaymentStateError(
        `Tender ${t.tenderId} Check scope mismatch`
      );
    }
  }

  for (const a of payment.allocations) {
    if (a.paymentId !== payment.paymentId) {
      throw new InvalidPaymentStateError(
        `Allocation ${a.allocationId} paymentId mismatch`
      );
    }
  }

  if (
    payment.status === "applied" &&
    parseSplitPaymentMoney(payment.unallocatedAmount) > 0.001
  ) {
    throw new InvalidPaymentStateError(
      "Applied Payment must have zero unallocated amount"
    );
  }
}

/** I-SP-01 Check-scope conservation. */
export function assertOutstandingInvariants(
  responsibility: CheckFinancialResponsibility
): void {
  assertCheckConservation(responsibility);
}

/** I-SP-05 — Payment amount ≤ outstanding at apply/create-capture time. */
export function assertPaymentRespectsOutstanding(
  paymentAmount: string,
  outstandingBalance: string
): void {
  assertPaymentWithinOutstanding(paymentAmount, outstandingBalance);
}

/** I-SP-04 / tender conservation on Payment. */
export function assertAllocationInvariants(payment: SplitPayment): void {
  assertTenderTotalsMatchPayment(payment.amount, payment.tenders);
  assertPaymentMoneyAlgebra(payment);
}

/**
 * I-SP-06 — Payment Success / Completion MUST NOT imply Financial Settlement.
 * Domain commands never set Check outcome; this flag is permanently false.
 */
export function assertPaymentFinality(payment: SplitPayment): void {
  if (payment.impliesFinancialSettlement !== false) {
    throw new FinalityViolationError(
      "I-SP-06: Payment must never imply Financial Settlement"
    );
  }
}

/** I-SP-02 / I-SP-03 — no inventing or destroying money via allocation math. */
export function assertNoMoneyInvention(
  payment: SplitPayment,
  newAllocations: readonly PaymentAllocation[]
): void {
  let sum = 0;
  for (const a of [...payment.allocations, ...newAllocations]) {
    sum += parseSplitPaymentMoney(a.amount);
  }
  if (sum - parseSplitPaymentMoney(payment.amount) > 0.001) {
    throw new SplitPaymentDomainError(
      "FINANCIAL_CONSERVATION_VIOLATION",
      "I-SP-02/04: allocations invent money beyond Payment amount"
    );
  }
}

export function assertNoTerminalRegression(
  from: SplitPayment["status"],
  to: SplitPayment["status"]
): void {
  assertTransitionAllowed(from, to);
}

export function assertPaymentIdentityStable(
  before: SplitPayment,
  after: SplitPayment
): void {
  assertIdentityUnchanged(before, after);
}

export function assertCreateInputs(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
  paymentReference: string;
  financialReference?: string | null;
  checkRestaurantId: number;
  amount: string;
  outstandingBalance: string;
  existingPaymentIds?: readonly string[];
}): void {
  assertSplitPaymentIdentity({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    paymentId: input.paymentId,
  });
  assertPaymentReference(input.paymentReference);
  assertFinancialReference(input.financialReference ?? null);
  assertTenantMatch({
    paymentRestaurantId: input.restaurantId,
    checkRestaurantId: input.checkRestaurantId,
  });
  assertPaymentId(input.paymentId);
  if (input.existingPaymentIds?.includes(input.paymentId)) {
    throw new SplitPaymentDomainError(
      "DUPLICATE_IDENTITY",
      `PaymentId already exists: ${input.paymentId}`
    );
  }
  // Pending create may exceed outstanding until capture/apply; capture path checks.
}

/** Full validation of a Payment entity after mutation. */
export function assertSplitPaymentValid(payment: SplitPayment): void {
  assertPaymentValid(payment);
  assertPaymentFinality(payment);
  assertAllocationInvariants(payment);
}

export function assertTendersBelongToPayment(
  payment: SplitPayment,
  tenders: readonly Tender[]
): void {
  for (const t of tenders) {
    if (t.paymentId !== payment.paymentId) {
      throw new InvalidPaymentStateError(
        `Tender ${t.tenderId} does not belong to Payment ${payment.paymentId}`
      );
    }
  }
}

export function isPaymentCompleted(payment: SplitPayment): boolean {
  return payment.status === "applied";
}

export function isPaymentTerminal(payment: SplitPayment): boolean {
  return isSplitPaymentTerminalStatus(payment.status);
}

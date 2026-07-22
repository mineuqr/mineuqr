/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — Payment Identity Governance.
 *
 * Domain identities are opaque stable strings. They must never change across
 * Authorization, Capture, Partial Allocation, Completion, Refund, or Void.
 * Independent from persistence surrogates and transport eventIds.
 */

import type {
  FinancialReference,
  PaymentAttempt,
  PaymentAttemptId,
  PaymentId,
  PaymentReference,
  SplitPayment,
  SplitPaymentIdentity,
  TenderAllocationId,
} from "./splitPaymentContract";
import {
  DuplicateIdentityError,
  IdentityViolationError,
} from "./splitPaymentErrors";

const ID_MIN_LEN = 1;
const ID_MAX_LEN = 128;

function assertOpaqueId(label: string, value: string): void {
  if (typeof value !== "string") {
    throw new IdentityViolationError(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < ID_MIN_LEN || trimmed.length > ID_MAX_LEN) {
    throw new IdentityViolationError(
      `${label} length must be ${ID_MIN_LEN}–${ID_MAX_LEN}`
    );
  }
  if (trimmed !== value) {
    throw new IdentityViolationError(
      `${label} must not have leading/trailing whitespace`
    );
  }
  // Domain ids must not look like transport/event envelope keys.
  if (value.startsWith("evt_") || value.startsWith("transport:")) {
    throw new IdentityViolationError(
      `${label} must be independent from transport/event envelope ids`
    );
  }
}

export function assertPaymentId(paymentId: PaymentId): void {
  assertOpaqueId("PaymentId", paymentId);
}

export function assertPaymentAttemptId(attemptId: PaymentAttemptId): void {
  assertOpaqueId("PaymentAttemptId", attemptId);
}

export function assertTenderAllocationId(id: TenderAllocationId): void {
  assertOpaqueId("TenderAllocationId", id);
}

export function assertPaymentReference(ref: PaymentReference): void {
  assertOpaqueId("PaymentReference", ref);
}

export function assertFinancialReference(
  ref: FinancialReference | null | undefined
): void {
  if (ref == null) return;
  assertOpaqueId("FinancialReference", ref);
}

export function assertSplitPaymentIdentity(
  identity: SplitPaymentIdentity
): void {
  if (
    !Number.isInteger(identity.restaurantId) ||
    identity.restaurantId <= 0 ||
    !Number.isInteger(identity.checkId) ||
    identity.checkId <= 0
  ) {
    throw new IdentityViolationError(
      "SplitPayment identity requires positive integer restaurantId and checkId"
    );
  }
  assertPaymentId(identity.paymentId);
}

/** I-SP-08 — tenant isolation on Payment identity. */
export function assertTenantMatch(input: {
  paymentRestaurantId: number;
  checkRestaurantId: number;
}): void {
  if (input.paymentRestaurantId !== input.checkRestaurantId) {
    throw new IdentityViolationError(
      `I-SP-08: Payment restaurantId ${input.paymentRestaurantId} != Check restaurantId ${input.checkRestaurantId}`
    );
  }
}

export function assertUniquePaymentId(
  paymentId: PaymentId,
  existingPaymentIds: readonly PaymentId[]
): void {
  assertPaymentId(paymentId);
  if (existingPaymentIds.includes(paymentId)) {
    throw new DuplicateIdentityError(
      `PaymentId already exists: ${paymentId}`
    );
  }
}

export function assertUniquePaymentAttemptId(
  attemptId: PaymentAttemptId,
  existingAttemptIds: readonly PaymentAttemptId[]
): void {
  assertPaymentAttemptId(attemptId);
  if (existingAttemptIds.includes(attemptId)) {
    throw new DuplicateIdentityError(
      `PaymentAttemptId already exists: ${attemptId}`
    );
  }
}

/**
 * Identity stability: after any command, PaymentId / PaymentReference /
 * FinancialReference must equal the pre-transition values when provided.
 */
export function assertIdentityUnchanged(
  before: Pick<
    SplitPayment,
    "paymentId" | "paymentReference" | "financialReference" | "restaurantId" | "checkId"
  >,
  after: Pick<
    SplitPayment,
    "paymentId" | "paymentReference" | "financialReference" | "restaurantId" | "checkId"
  >
): void {
  if (before.paymentId !== after.paymentId) {
    throw new IdentityViolationError(
      "PaymentId must never change across lifecycle transitions"
    );
  }
  if (before.paymentReference !== after.paymentReference) {
    throw new IdentityViolationError(
      "PaymentReference must never change across lifecycle transitions"
    );
  }
  if (before.financialReference !== after.financialReference) {
    throw new IdentityViolationError(
      "FinancialReference must never change across lifecycle transitions"
    );
  }
  if (
    before.restaurantId !== after.restaurantId ||
    before.checkId !== after.checkId
  ) {
    throw new IdentityViolationError(
      "Payment Check scope (restaurantId, checkId) must never change"
    );
  }
}

/** Attempt remains independently identified; parent PaymentId may bind once. */
export function assertAttemptTraceableToPayment(
  attempt: PaymentAttempt,
  payment: SplitPayment | null
): void {
  assertPaymentAttemptId(attempt.attemptId);
  if (attempt.paymentId == null) return;
  assertPaymentId(attempt.paymentId);
  if (payment == null) return;
  if (attempt.paymentId !== payment.paymentId) {
    throw new IdentityViolationError(
      `PaymentAttempt ${attempt.attemptId} paymentId ${attempt.paymentId} does not match Payment ${payment.paymentId}`
    );
  }
  if (
    attempt.restaurantId !== payment.restaurantId ||
    attempt.checkId !== payment.checkId
  ) {
    throw new IdentityViolationError(
      "PaymentAttempt must share Check scope with parent Payment"
    );
  }
}

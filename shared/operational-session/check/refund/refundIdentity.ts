/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — identity governance.
 * Business uniqueness independent of transport eventId (ADR-021).
 */

import type { RefundId, RefundIdentity, RefundReference } from "./refundContract";
import {
  DuplicateRefundError,
  RefundIdentityViolationError,
  RefundTenantIsolationError,
} from "./refundErrors";

const ID_MIN_LEN = 1;
const ID_MAX_LEN = 128;

function assertOpaqueId(label: string, value: string): void {
  if (typeof value !== "string") {
    throw new RefundIdentityViolationError(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < ID_MIN_LEN || trimmed.length > ID_MAX_LEN) {
    throw new RefundIdentityViolationError(
      `${label} length must be ${ID_MIN_LEN}–${ID_MAX_LEN}`
    );
  }
  if (trimmed !== value) {
    throw new RefundIdentityViolationError(
      `${label} must not have leading/trailing whitespace`
    );
  }
  if (value.startsWith("evt_") || value.startsWith("transport:")) {
    throw new RefundIdentityViolationError(
      `${label} must be independent from transport/event envelope ids`
    );
  }
}

export function assertRefundId(id: RefundId): void {
  assertOpaqueId("RefundId", id);
}

export function assertRefundReference(
  ref: RefundReference | null | undefined
): void {
  if (ref == null) return;
  assertOpaqueId("RefundReference", ref);
}

export function assertRefundIdentity(identity: RefundIdentity): void {
  if (!Number.isInteger(identity.restaurantId) || identity.restaurantId <= 0) {
    throw new RefundIdentityViolationError(
      "restaurantId must be a positive integer"
    );
  }
  if (!Number.isInteger(identity.checkId) || identity.checkId <= 0) {
    throw new RefundIdentityViolationError(
      "checkId must be a positive integer"
    );
  }
  assertRefundId(identity.refundId);
}

export function assertTenantMatch(input: {
  refundRestaurantId: number;
  checkRestaurantId: number;
  priorRecordRestaurantId?: number;
}): void {
  if (input.refundRestaurantId !== input.checkRestaurantId) {
    throw new RefundTenantIsolationError(
      `RF-INV-TEN01: Refund restaurantId ${input.refundRestaurantId} != Check ${input.checkRestaurantId}`
    );
  }
  if (
    input.priorRecordRestaurantId != null &&
    input.priorRecordRestaurantId !== input.refundRestaurantId
  ) {
    throw new RefundTenantIsolationError(
      `RF-INV-TEN02: prior Settlement Record tenant mismatch`
    );
  }
}

export function buildRefundId(input: {
  restaurantId: number;
  checkId: number;
  recordGeneration: number;
}): RefundId {
  if (!Number.isInteger(input.recordGeneration) || input.recordGeneration < 1) {
    throw new RefundIdentityViolationError(
      "recordGeneration must be a positive integer"
    );
  }
  return `rfnd:${input.restaurantId}:${input.checkId}:gen:${input.recordGeneration}`;
}

export function buildRefundReference(input: {
  checkId: number;
  recordGeneration: number;
}): RefundReference {
  return `refund:check:${input.checkId}:gen:${input.recordGeneration}`;
}

/** ADR-021 business-fact claim key for Refund apply / publish. */
export function buildRefundEventClaimKey(input: {
  restaurantId: number;
  checkId: number;
  refundId: string;
}): string {
  assertRefundIdentity(input);
  return `refund_applied:${input.restaurantId}:${input.checkId}:${input.refundId}`;
}

export function assertUniqueRefundId(
  identity: RefundIdentity,
  existing: readonly RefundIdentity[]
): void {
  assertRefundIdentity(identity);
  const dup = existing.find(
    (e) =>
      e.restaurantId === identity.restaurantId &&
      e.checkId === identity.checkId &&
      e.refundId === identity.refundId
  );
  if (dup) {
    throw new DuplicateRefundError(
      `RF-INV-I02: Refund already exists for ${identity.refundId}`
    );
  }
}

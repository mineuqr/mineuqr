/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — Allocation Identity Governance.
 *
 * Domain identities are opaque stable strings. They must never change across
 * Reserve, Apply, Adjust, Complete, Reverse, or Cancel.
 * Independent from persistence surrogates and transport eventIds.
 */

import type {
  AllocationAdjustmentId,
  AllocationId,
  AllocationPortionId,
  AllocationReference,
  AllocationReversalId,
  AllocationSequence,
  FinancialReference,
  MultiCheckAllocation,
  MultiCheckAllocationIdentity,
  SourcePaymentId,
} from "./multiCheckAllocationContract";
import {
  DuplicateIdentityError,
  IdentityViolationError,
} from "./multiCheckAllocationErrors";

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
  if (value.startsWith("evt_") || value.startsWith("transport:")) {
    throw new IdentityViolationError(
      `${label} must be independent from transport/event envelope ids`
    );
  }
}

export function assertAllocationId(allocationId: AllocationId): void {
  assertOpaqueId("AllocationId", allocationId);
}

export function assertAllocationReference(ref: AllocationReference): void {
  assertOpaqueId("AllocationReference", ref);
}

export function assertFinancialReference(
  ref: FinancialReference | null | undefined
): void {
  if (ref == null) return;
  assertOpaqueId("FinancialReference", ref);
}

export function assertSourcePaymentId(
  id: SourcePaymentId | null | undefined
): void {
  if (id == null) return;
  assertOpaqueId("SourcePaymentId", id);
}

export function assertAllocationPortionId(id: AllocationPortionId): void {
  assertOpaqueId("AllocationPortionId", id);
}

export function assertAllocationAdjustmentId(id: AllocationAdjustmentId): void {
  assertOpaqueId("AllocationAdjustmentId", id);
}

export function assertAllocationReversalId(id: AllocationReversalId): void {
  assertOpaqueId("AllocationReversalId", id);
}

export function assertAllocationSequence(sequence: AllocationSequence): void {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new IdentityViolationError(
      "AllocationSequence must be a positive integer (≥ 1)"
    );
  }
}

export function assertCheckId(label: string, checkId: number): void {
  if (!Number.isInteger(checkId) || checkId <= 0) {
    throw new IdentityViolationError(
      `${label} must be a positive integer Check identity`
    );
  }
}

export function assertMultiCheckAllocationIdentity(
  identity: MultiCheckAllocationIdentity
): void {
  if (!Number.isInteger(identity.restaurantId) || identity.restaurantId <= 0) {
    throw new IdentityViolationError(
      "Allocation identity requires positive integer restaurantId"
    );
  }
  assertAllocationId(identity.allocationId);
}

/** I-MCA-13 — tenant isolation. */
export function assertTenantMatch(input: {
  allocationRestaurantId: number;
  checkRestaurantId: number;
}): void {
  if (input.allocationRestaurantId !== input.checkRestaurantId) {
    throw new IdentityViolationError(
      `I-MCA-13: Allocation restaurantId ${input.allocationRestaurantId} != Check restaurantId ${input.checkRestaurantId}`
    );
  }
}

export function assertUniqueAllocationId(
  allocationId: AllocationId,
  existingAllocationIds: readonly AllocationId[]
): void {
  assertAllocationId(allocationId);
  if (existingAllocationIds.includes(allocationId)) {
    throw new DuplicateIdentityError(
      `AllocationId already exists: ${allocationId}`
    );
  }
}

/**
 * I-MCA-07 / I-MCA-08 — identity stability across lifecycle.
 * Checks never lose financial identity via Allocation.
 */
export function assertIdentityUnchanged(
  before: Pick<
    MultiCheckAllocation,
    | "allocationId"
    | "allocationReference"
    | "financialReference"
    | "restaurantId"
    | "sourceCheckId"
    | "sourcePaymentId"
  >,
  after: Pick<
    MultiCheckAllocation,
    | "allocationId"
    | "allocationReference"
    | "financialReference"
    | "restaurantId"
    | "sourceCheckId"
    | "sourcePaymentId"
  >
): void {
  if (before.allocationId !== after.allocationId) {
    throw new IdentityViolationError(
      "AllocationId must never change across lifecycle transitions"
    );
  }
  if (before.allocationReference !== after.allocationReference) {
    throw new IdentityViolationError(
      "AllocationReference must never change across lifecycle transitions"
    );
  }
  if (before.financialReference !== after.financialReference) {
    throw new IdentityViolationError(
      "FinancialReference must never change across lifecycle transitions"
    );
  }
  if (before.restaurantId !== after.restaurantId) {
    throw new IdentityViolationError(
      "Allocation restaurantId must never change"
    );
  }
  if (before.sourceCheckId !== after.sourceCheckId) {
    throw new IdentityViolationError(
      "I-MCA-08: SourceCheckId must never change (Checks never lose financial identity)"
    );
  }
  if (before.sourcePaymentId !== after.sourcePaymentId) {
    throw new IdentityViolationError(
      "SourcePaymentId binding must never change across lifecycle transitions"
    );
  }
}

export function assertUniquePortionIds(
  portionIds: readonly AllocationPortionId[]
): void {
  const seen = new Set<string>();
  for (const id of portionIds) {
    assertAllocationPortionId(id);
    if (seen.has(id)) {
      throw new DuplicateIdentityError(`Duplicate AllocationPortionId: ${id}`);
    }
    seen.add(id);
  }
}

export function assertUniqueSequences(
  sequences: readonly AllocationSequence[]
): void {
  const seen = new Set<number>();
  for (const seq of sequences) {
    assertAllocationSequence(seq);
    if (seen.has(seq)) {
      throw new DuplicateIdentityError(`Duplicate AllocationSequence: ${seq}`);
    }
    seen.add(seq);
  }
}

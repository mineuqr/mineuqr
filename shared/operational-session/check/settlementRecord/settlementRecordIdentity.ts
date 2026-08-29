/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — identity governance.
 *
 * Identities are opaque and stable. Surrogate DB ids never replace them.
 * Business uniqueness: (restaurantId, checkId, recordKind, recordGeneration).
 */

import type {
  SettlementFinancialReference,
  SettlementRecordId,
  SettlementRecordIdentity,
  SettlementRecordKind,
} from "./settlementRecordContract";
import {
  DuplicateSettlementRecordError,
  IdentityViolationError,
} from "./settlementRecordErrors";

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

export function assertSettlementRecordId(id: SettlementRecordId): void {
  assertOpaqueId("SettlementRecordId", id);
}

export function assertFinancialReference(
  ref: SettlementFinancialReference | null | undefined
): void {
  if (ref == null) return;
  assertOpaqueId("FinancialReference", ref);
}

export function assertRecordGeneration(generation: number): void {
  if (!Number.isInteger(generation) || generation < 1) {
    throw new IdentityViolationError(
      "recordGeneration must be a positive integer (≥ 1)"
    );
  }
}

export function assertCheckId(checkId: number): void {
  if (!Number.isInteger(checkId) || checkId <= 0) {
    throw new IdentityViolationError(
      "checkId must be a positive integer Check identity"
    );
  }
}

export function assertRestaurantId(restaurantId: number): void {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new IdentityViolationError(
      "restaurantId must be a positive integer tenant identity"
    );
  }
}

export function assertSettlementRecordIdentity(
  identity: SettlementRecordIdentity
): void {
  assertRestaurantId(identity.restaurantId);
  assertCheckId(identity.checkId);
  assertRecordGeneration(identity.recordGeneration);
  if (!identity.recordKind) {
    throw new IdentityViolationError("recordKind is required");
  }
}

/**
 * Deterministic opaque document id for primary settle generations.
 * Enables safe retries without inventing a second identity (SR-INV-05).
 */
export function buildSettlementRecordId(input: {
  restaurantId: number;
  checkId: number;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
}): SettlementRecordId {
  assertSettlementRecordIdentity(input);
  return `sr:${input.restaurantId}:${input.checkId}:${input.recordKind}:${input.recordGeneration}`;
}

/**
 * CHECK-RESIDUAL-FINANCIAL-REFERENCE-CLEANUP-1
 * Settlement document correlation only. Check-scoped because one SR per Check.
 * Do not treat this as Invoice, CF, PAID, or payment authority.
 */
export function buildSettlementFinancialReference(input: {
  checkId: number;
  recordGeneration: number;
}): SettlementFinancialReference {
  assertCheckId(input.checkId);
  assertRecordGeneration(input.recordGeneration);
  return `fin:check:${input.checkId}:gen:${input.recordGeneration}`;
}

/** ADR-021 business-fact claim key for SettlementRecordCreated. */
export function buildSettlementRecordEventClaimKey(input: {
  restaurantId: number;
  checkId: number;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
}): string {
  assertSettlementRecordIdentity(input);
  return `sr_created:${input.restaurantId}:${input.checkId}:${input.recordKind}:${input.recordGeneration}`;
}

export function assertUniqueBusinessIdentity(
  identity: SettlementRecordIdentity,
  existing: readonly SettlementRecordIdentity[]
): void {
  assertSettlementRecordIdentity(identity);
  const dup = existing.find(
    (e) =>
      e.restaurantId === identity.restaurantId &&
      e.checkId === identity.checkId &&
      e.recordKind === identity.recordKind &&
      e.recordGeneration === identity.recordGeneration
  );
  if (dup) {
    throw new DuplicateSettlementRecordError(
      `SR-INV-05: Settlement Record already exists for check=${identity.checkId} kind=${identity.recordKind} gen=${identity.recordGeneration}`
    );
  }
}

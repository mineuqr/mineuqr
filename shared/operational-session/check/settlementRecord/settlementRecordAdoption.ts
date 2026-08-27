/**
 * REFUND-SETTLEMENT-RECORD-ADOPTION-1 / ADR-ARCH-026 / ADR-ARCH-032
 *
 * Polymorphic Settlement Record adoption helpers.
 * Refund is a native Settlement Record kind — no parallel model, no second ledger.
 */

import type { SettlementRecord, SettlementRecordKind } from "./settlementRecordContract";
import { SettlementRecordInvariantError } from "./settlementRecordErrors";
import { assertAppendOnly, assertCompensatingRequiresPrior } from "./settlementRecordInvariants";

export const SETTLEMENT_RECORD_ADOPTION_PROGRAM_ID =
  "REFUND-SETTLEMENT-RECORD-ADOPTION-1" as const;

/** Compensating kinds share the same append-only publication model. */
export const COMPENSATING_SETTLEMENT_RECORD_KINDS = [
  "refund",
  "reversal",
  "correction",
] as const;

export type CompensatingSettlementRecordKind =
  (typeof COMPENSATING_SETTLEMENT_RECORD_KINDS)[number];

export function isCompensatingSettlementRecordKind(
  kind: SettlementRecordKind
): kind is CompensatingSettlementRecordKind {
  return (COMPENSATING_SETTLEMENT_RECORD_KINDS as readonly string[]).includes(
    kind
  );
}

export function isCompensatingSettlementRecord(
  record: Pick<SettlementRecord, "recordKind" | "priorSettlementRecordId">
): boolean {
  // Refund documents remain compensating even when the first CF-backed
  // refund has no priorSettlementRecordId (original sale identity is CF).
  if (isRefundSettlementRecord(record)) return true;
  return (
    isCompensatingSettlementRecordKind(record.recordKind) &&
    record.priorSettlementRecordId != null
  );
}

export function isRefundSettlementRecord(
  record: Pick<SettlementRecord, "recordKind">
): boolean {
  return record.recordKind === "refund";
}

/**
 * Chronological / generation ordering for a Check settlement chain.
 * Stable: generation ASC, then createdAt ASC, then settlementRecordId ASC.
 */
export function sortSettlementRecordsChronologically(
  records: readonly SettlementRecord[]
): SettlementRecord[] {
  return [...records].sort((a, b) => {
    if (a.recordGeneration !== b.recordGeneration) {
      return a.recordGeneration - b.recordGeneration;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return a.settlementRecordId < b.settlementRecordId ? -1 : 1;
  });
}

/** Newest-first history ordering (list UX). */
export function sortSettlementRecordsNewestFirst(
  records: readonly SettlementRecord[]
): SettlementRecord[] {
  return sortSettlementRecordsChronologically(records).reverse();
}

/**
 * Assert compensating chain integrity for a Check's Settlement Records.
 * Does not mutate. Primary settlement/void gens may omit prior.
 * First CF-backed refund may omit prior (original sale is CF). Reversal/correction still require prior.
 */
export function assertSettlementRecordChainIntegrity(
  records: readonly SettlementRecord[]
): void {
  const byId = new Map(
    records.map((r) => [r.settlementRecordId, r] as const)
  );
  const tenantIds = new Set(records.map((r) => r.restaurantId));
  if (tenantIds.size > 1) {
    throw new SettlementRecordInvariantError(
      "SR-INV-07: Settlement Record chain crosses tenants"
    );
  }

  const checkIds = new Set(records.map((r) => r.checkId));
  if (checkIds.size > 1) {
    throw new SettlementRecordInvariantError(
      "Settlement Record chain spans multiple Checks"
    );
  }

  for (const record of records) {
    assertCompensatingRequiresPrior(
      record.recordKind,
      record.priorSettlementRecordId
    );
    if (record.priorSettlementRecordId == null) continue;
    const prior = byId.get(record.priorSettlementRecordId);
    if (!prior) {
      // Prior may be outside a partial history slice — allowed.
      continue;
    }
    if (prior.restaurantId !== record.restaurantId) {
      throw new SettlementRecordInvariantError(
        "RF-INV-TEN02: prior Settlement Record tenant mismatch"
      );
    }
    if (prior.checkId !== record.checkId) {
      throw new SettlementRecordInvariantError(
        "Compensating Settlement Record prior must belong to the same Check"
      );
    }
  }

  // Business uniqueness: (restaurantId, checkId, recordKind, recordGeneration)
  const seen = new Set<string>();
  for (const record of records) {
    const key = `${record.restaurantId}:${record.checkId}:${record.recordKind}:${record.recordGeneration}`;
    if (seen.has(key)) {
      throw new SettlementRecordInvariantError(
        `SR-INV-05: duplicate Settlement Record identity ${key}`
      );
    }
    seen.add(key);
  }
}

/** Immutability proof helper for adoption audits. */
export function assertSettlementRecordAppendOnlyOperation(
  operation: "insert" | "update" | "delete"
): void {
  assertAppendOnly(operation);
}

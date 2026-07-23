/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — mandatory invariants.
 *
 * SR-INV-01…10. Settlement Record never calculates money and never mutates.
 */

import { CHECK_TERMINAL_OUTCOMES, type CheckTerminalOutcome } from "../checkContract";
import type {
  SettlementRecord,
  SettlementRecordKind,
} from "./settlementRecordContract";
import {
  SETTLEMENT_RECORD_PRODUCER,
  SETTLEMENT_RECORD_SCHEMA_VERSION,
} from "./settlementRecordContract";
import {
  ImmutabilityViolationError,
  MonetaryConsistencyError,
  SettlementRecordInvariantError,
  SnapshotIntegrityError,
  TenantIsolationError,
  UnsupportedSettlementRecordOperationError,
} from "./settlementRecordErrors";
import {
  assertCheckId,
  assertFinancialReference,
  assertRecordGeneration,
  assertRestaurantId,
  assertSettlementRecordId,
} from "./settlementRecordIdentity";

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

function assertCopiedMoneyField(label: string, value: string): void {
  if (typeof value !== "string" || !MONEY_PATTERN.test(value)) {
    throw new SnapshotIntegrityError(
      `${label} must be a copied decimal string (SR-INV-01)`
    );
  }
}

export function assertTenantIsolation(input: {
  recordRestaurantId: number;
  checkRestaurantId: number;
}): void {
  if (input.recordRestaurantId !== input.checkRestaurantId) {
    throw new TenantIsolationError(
      `SR-INV-07: Settlement Record restaurantId ${input.recordRestaurantId} != Check restaurantId ${input.checkRestaurantId}`
    );
  }
}

export function assertNotMonetaryAuthority(): void {
  // Structural reminder for consumers — Settlement Record is publication only.
  // No-op assertion body; presence documents SR-INV-03 in domain surface.
}

export function assertNeverCalculatesMoney(): void {
  // Domain module must not export money calculators. Guarded in architecture tests.
}

/**
 * Forbid UPDATE of money fields — corrections require compensating records (SR-INV-02).
 */
export function assertAppendOnly(
  operation: "insert" | "update" | "delete"
): void {
  if (operation === "update" || operation === "delete") {
    throw new ImmutabilityViolationError(
      `SR-INV-02: Settlement Record money is append-only; ${operation} is forbidden — use compensating records`
    );
  }
}

export function assertCompensatingRequiresPrior(
  recordKind: SettlementRecordKind,
  priorSettlementRecordId: string | null
): void {
  // Primary Check void finalize publishes recordKind=void without a prior.
  // Refund / reversal / correction always compensate a prior document.
  if (
    (recordKind === "refund" ||
      recordKind === "reversal" ||
      recordKind === "correction") &&
    priorSettlementRecordId == null
  ) {
    throw new SettlementRecordInvariantError(
      `Compensating recordKind=${recordKind} requires priorSettlementRecordId`
    );
  }
}

export function assertTerminalOutcome(
  outcome: string
): asserts outcome is CheckTerminalOutcome {
  if (!(CHECK_TERMINAL_OUTCOMES as readonly string[]).includes(outcome)) {
    throw new SettlementRecordInvariantError(
      `Settlement Record outcome must be a terminal Check outcome, got ${outcome}`
    );
  }
}

/**
 * Copied money on the Record must equal the finalized Check freeze values.
 * Comparison only — never recalculates (SR-INV-01 / SR-INV-03).
 */
export function assertMonetaryConsistencyWithCheck(input: {
  record: Pick<
    SettlementRecord,
    "subtotal" | "discountAmount" | "taxAmount" | "grandTotal" | "outcome"
  >;
  check: {
    subtotal: string;
    billDiscountAmount: string;
    taxAmount: string;
    grandTotal: string;
    outcome: string;
  };
}): void {
  const { record, check } = input;
  if (record.subtotal !== String(check.subtotal)) {
    throw new MonetaryConsistencyError(
      `SR-INV-01/03: subtotal copy mismatch record=${record.subtotal} check=${check.subtotal}`
    );
  }
  if (record.discountAmount !== String(check.billDiscountAmount)) {
    throw new MonetaryConsistencyError(
      `SR-INV-01/03: discountAmount copy mismatch record=${record.discountAmount} check=${check.billDiscountAmount}`
    );
  }
  if (record.taxAmount !== String(check.taxAmount)) {
    throw new MonetaryConsistencyError(
      `SR-INV-01/03: taxAmount copy mismatch record=${record.taxAmount} check=${check.taxAmount}`
    );
  }
  if (record.grandTotal !== String(check.grandTotal)) {
    throw new MonetaryConsistencyError(
      `SR-INV-01/03: grandTotal copy mismatch record=${record.grandTotal} check=${check.grandTotal}`
    );
  }
  if (record.outcome !== check.outcome) {
    throw new MonetaryConsistencyError(
      `SR-INV-01/03: outcome copy mismatch record=${record.outcome} check=${check.outcome}`
    );
  }
}

export function assertSettlementRecordValid(record: SettlementRecord): void {
  assertSettlementRecordId(record.settlementRecordId);
  assertRestaurantId(record.restaurantId);
  assertCheckId(record.checkId);
  assertRecordGeneration(record.recordGeneration);
  assertFinancialReference(record.financialReference);
  assertTerminalOutcome(record.outcome);
  assertCompensatingRequiresPrior(
    record.recordKind,
    record.priorSettlementRecordId
  );

  if (record.schemaVersion !== SETTLEMENT_RECORD_SCHEMA_VERSION) {
    throw new SnapshotIntegrityError(
      `Unsupported Settlement Record schemaVersion=${record.schemaVersion}`
    );
  }
  if (record.producer !== SETTLEMENT_RECORD_PRODUCER) {
    throw new SettlementRecordInvariantError(
      `SR-INV-04 producer must be ${SETTLEMENT_RECORD_PRODUCER}`
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.businessDay)) {
    throw new SnapshotIntegrityError(
      `businessDay must be frozen YYYY-MM-DD, got ${record.businessDay}`
    );
  }

  assertCopiedMoneyField("subtotal", record.subtotal);
  assertCopiedMoneyField("discountAmount", record.discountAmount);
  assertCopiedMoneyField("taxAmount", record.taxAmount);
  assertCopiedMoneyField("grandTotal", record.grandTotal);

  if (!record.currencySnapshot?.currencyCode) {
    throw new SnapshotIntegrityError("currencySnapshot is required (SR-INV-08)");
  }
  if (
    record.taxPolicySnapshot == null ||
    typeof record.taxPolicySnapshot.version !== "number"
  ) {
    throw new SnapshotIntegrityError("taxPolicySnapshot is required (SR-INV-08)");
  }
  if (!Array.isArray(record.paymentSnapshot)) {
    throw new SnapshotIntegrityError("paymentSnapshot must be an array");
  }
  if (!Array.isArray(record.orderRefs)) {
    throw new SnapshotIntegrityError("orderRefs must be an array");
  }

  if (
    record.sessionId != null &&
    (!Number.isInteger(record.sessionId) || record.sessionId <= 0)
  ) {
    throw new SettlementRecordInvariantError(
      "sessionId must be null or a positive integer"
    );
  }
}

/** Explicitly forbid domain UPDATE of an existing Settlement Record. */
export function forbidSettlementRecordMutation(): never {
  throw new UnsupportedSettlementRecordOperationError(
    "SR-INV-02: Settlement Record mutation is forbidden; append compensating records only"
  );
}

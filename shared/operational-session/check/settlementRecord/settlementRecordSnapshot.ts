/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — snapshot builder.
 *
 * Copies finalized Check / tender / enrollment facts into an immutable document.
 * MUST NEVER calculate subtotal, discounts, tax, grand total, FX, or service charges.
 */

import type {
  CheckTerminalOutcome,
  CurrencySnapshot,
  OperationalCheck,
  TaxBreakdown,
  TaxPolicySnapshot,
} from "../checkContract";
import type { SettlementTransaction } from "../settlementTransactionContract";
import type { OrderSettlement } from "../orderSettlement/orderSettlementContract";
import {
  SETTLEMENT_RECORD_PRODUCER,
  SETTLEMENT_RECORD_SCHEMA_VERSION,
  type SettlementOrderRef,
  type SettlementOrderSettlementRef,
  type SettlementPaymentSnapshotLine,
  type SettlementRecord,
  type SettlementRecordKind,
} from "./settlementRecordContract";
import { SnapshotIntegrityError } from "./settlementRecordErrors";
import {
  buildSettlementFinancialReference,
  buildSettlementRecordId,
} from "./settlementRecordIdentity";
import { assertSettlementRecordValid } from "./settlementRecordInvariants";

export type SettlementRecordSnapshotSource = Readonly<{
  check: Pick<
    OperationalCheck,
    | "id"
    | "restaurantId"
    | "sessionId"
    | "outcome"
    | "subtotal"
    | "billDiscountAmount"
    | "taxAmount"
    | "taxBreakdown"
    | "grandTotal"
    | "currencySnapshot"
    | "taxPolicySnapshot"
    | "settledAt"
  >;
  /** Terminal outcome after finalize (must already be non-open). */
  outcome: CheckTerminalOutcome;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
  priorSettlementRecordId?: string | null;
  /** Frozen YYYY-MM-DD at finalize — never recomputed later from settings. */
  businessDay: string;
  createdAt: string;
  orderIds: readonly number[];
  orderSettlements?: readonly Pick<
    OrderSettlement,
    "orderId" | "checkId" | "status"
  >[];
  /**
   * Tender lines already persisted (or about to be in the same TX).
   * Copied verbatim — amounts are not summed or recalculated here.
   */
  paymentLines: readonly Pick<
    SettlementTransaction,
    | "id"
    | "paymentMethod"
    | "amount"
    | "currencyCode"
    | "status"
    | "businessTimestamp"
    | "reference"
    | "externalReference"
  >[];
  /** Pre-built payment snapshot when ST ids are not yet available (same TX). */
  paymentSnapshotOverride?: readonly SettlementPaymentSnapshotLine[];
  createdByActorType?: string | null;
  createdByActorId?: string | null;
  financialReference?: string | null;
}>;

function copyCurrencySnapshot(source: CurrencySnapshot): CurrencySnapshot {
  return {
    currencyCode: source.currencyCode,
    currencySymbol: source.currencySymbol,
  };
}

function copyTaxPolicySnapshot(source: TaxPolicySnapshot): TaxPolicySnapshot {
  return {
    version: source.version,
    enabled: source.enabled,
    mode: source.mode,
    components: source.components.map((c) => ({
      id: c.id,
      name: c.name,
      ratePercent: c.ratePercent,
    })),
  };
}

function copyTaxBreakdown(source: TaxBreakdown): TaxBreakdown {
  return {
    totalTaxAmount: source.totalTaxAmount,
    lines: source.lines.map((line) => ({
      componentId: line.componentId,
      name: line.name,
      ratePercent: line.ratePercent,
      amount: line.amount,
    })),
  };
}

export function copyPaymentSnapshotFromTransactions(
  lines: SettlementRecordSnapshotSource["paymentLines"]
): readonly SettlementPaymentSnapshotLine[] {
  return lines.map((line) => ({
    settlementTransactionId: line.id ?? null,
    paymentMethod: line.paymentMethod,
    amount: String(line.amount),
    currencyCode: line.currencyCode,
    status: line.status,
    businessTimestamp: line.businessTimestamp,
    reference: line.reference ?? null,
    externalReference: line.externalReference ?? null,
  }));
}

/**
 * Build an immutable Settlement Record by copying Check finalize facts.
 * Does not perform financial arithmetic.
 */
export function buildSettlementRecordSnapshot(
  source: SettlementRecordSnapshotSource
): SettlementRecord {
  if (source.check.outcome !== "open" && source.check.outcome !== source.outcome) {
    // Allow building from pre-persist in-memory freeze where outcome may still read open
    // only when caller supplies the terminal outcome separately.
  }
  if (source.outcome === ("open" as CheckTerminalOutcome)) {
    throw new SnapshotIntegrityError(
      "Cannot publish Settlement Record for open Check outcome"
    );
  }
  if (source.check.restaurantId <= 0 || source.check.id <= 0) {
    throw new SnapshotIntegrityError("Check identity incomplete for snapshot");
  }

  const orderRefs: SettlementOrderRef[] = source.orderIds.map((orderId) => ({
    orderId,
  }));
  const orderSettlementRefs: SettlementOrderSettlementRef[] = (
    source.orderSettlements ?? []
  ).map((os) => ({
    orderId: os.orderId,
    checkId: os.checkId,
    status: os.status,
  }));

  const paymentSnapshot =
    source.paymentSnapshotOverride ??
    copyPaymentSnapshotFromTransactions(source.paymentLines);

  const settlementRecordId = buildSettlementRecordId({
    restaurantId: source.check.restaurantId,
    checkId: source.check.id,
    recordKind: source.recordKind,
    recordGeneration: source.recordGeneration,
  });

  const record: SettlementRecord = {
    settlementRecordId,
    restaurantId: source.check.restaurantId,
    recordKind: source.recordKind,
    schemaVersion: SETTLEMENT_RECORD_SCHEMA_VERSION,
    recordGeneration: source.recordGeneration,
    checkId: source.check.id,
    sessionId: source.check.sessionId,
    financialReference:
      source.financialReference ??
      buildSettlementFinancialReference({
        checkId: source.check.id,
        recordGeneration: source.recordGeneration,
      }),
    priorSettlementRecordId: source.priorSettlementRecordId?.trim() || null,
    orderRefs,
    orderSettlementRefs,
    // Opaque copies — SR-INV-01
    subtotal: String(source.check.subtotal),
    discountAmount: String(source.check.billDiscountAmount),
    taxAmount: String(source.check.taxAmount),
    grandTotal: String(source.check.grandTotal),
    outcome: source.outcome,
    currencySnapshot: copyCurrencySnapshot(source.check.currencySnapshot),
    taxPolicySnapshot: copyTaxPolicySnapshot(source.check.taxPolicySnapshot),
    taxBreakdown: copyTaxBreakdown(source.check.taxBreakdown),
    paymentSnapshot,
    businessDay: source.businessDay,
    settledAt: source.check.settledAt,
    createdAt: source.createdAt,
    createdByActorType: source.createdByActorType ?? null,
    createdByActorId: source.createdByActorId ?? null,
    producer: SETTLEMENT_RECORD_PRODUCER,
  };

  assertSettlementRecordValid(record);
  return record;
}

/** Map Check terminal outcome to primary record kind for v1 finalize. */
export function recordKindForCheckOutcome(
  outcome: CheckTerminalOutcome
): SettlementRecordKind {
  if (outcome === "voided") return "void";
  return "settlement";
}

/**
 * Freeze business-day key from an already-resolved settle timestamp.
 * Uses calendar date prefix of the stored timestamp (YYYY-MM-DD…).
 * Historical rows never re-resolve opening hours from live settings (SR-INV-06).
 */
export function freezeBusinessDayFromTimestamp(timestamp: string): string {
  const day = timestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new SnapshotIntegrityError(
      `Cannot freeze businessDay from timestamp=${timestamp}`
    );
  }
  return day;
}

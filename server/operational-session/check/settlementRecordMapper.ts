/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — persistence mapping only.
 * No Domain invariant evaluation. No money calculation.
 */

import type { SelectSettlementRecord } from "../../../drizzle/schema";
import {
  assertSettlementRecordKind,
  type CheckTerminalOutcome,
  type CurrencySnapshot,
  type SettlementOrderRef,
  type SettlementOrderSettlementRef,
  type SettlementPaymentSnapshotLine,
  type SettlementRecord,
  type TaxBreakdown,
  type TaxPolicySnapshot,
} from "@shared/operational-session";

const TERMINAL_OUTCOMES = new Set(["paid", "complimentary", "voided"]);

export type SettlementRecordPersistenceRow = SelectSettlementRecord;

export type SettlementRecordInsertValues = {
  settlementRecordId: string;
  restaurantId: number;
  recordKind: SettlementRecord["recordKind"];
  schemaVersion: number;
  recordGeneration: number;
  checkId: number;
  sessionId: number | null;
  financialReference: string | null;
  priorSettlementRecordId: string | null;
  orderRefsJson: SettlementOrderRef[];
  orderSettlementRefsJson: SettlementOrderSettlementRef[];
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  outcome: SettlementRecord["outcome"];
  currencySnapshotJson: CurrencySnapshot;
  taxPolicySnapshotJson: TaxPolicySnapshot;
  taxBreakdownJson: TaxBreakdown;
  paymentSnapshotJson: SettlementPaymentSnapshotLine[];
  businessDay: string;
  settledAt: string | null;
  createdAt: string;
  createdByActorType: string | null;
  createdByActorId: string | null;
  producer: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mapRowToSettlementRecord(
  row: SelectSettlementRecord
): SettlementRecord {
  if (!TERMINAL_OUTCOMES.has(row.outcome)) {
    throw new Error(`Settlement Record cannot have outcome=${row.outcome}`);
  }
  const outcome = row.outcome as CheckTerminalOutcome;
  return {
    settlementRecordId: row.settlementRecordId,
    restaurantId: row.restaurantId,
    recordKind: assertSettlementRecordKind(row.recordKind),
    schemaVersion: row.schemaVersion,
    recordGeneration: row.recordGeneration,
    checkId: row.checkId,
    sessionId: row.sessionId ?? null,
    financialReference: row.financialReference ?? null,
    priorSettlementRecordId: row.priorSettlementRecordId ?? null,
    orderRefs: asArray<SettlementOrderRef>(row.orderRefsJson),
    orderSettlementRefs: asArray<SettlementOrderSettlementRef>(
      row.orderSettlementRefsJson
    ),
    subtotal: String(row.subtotal),
    discountAmount: String(row.discountAmount),
    taxAmount: String(row.taxAmount),
    grandTotal: String(row.grandTotal),
    outcome,
    currencySnapshot: row.currencySnapshotJson as CurrencySnapshot,
    taxPolicySnapshot: row.taxPolicySnapshotJson as TaxPolicySnapshot,
    taxBreakdown: row.taxBreakdownJson as TaxBreakdown,
    paymentSnapshot: asArray<SettlementPaymentSnapshotLine>(
      row.paymentSnapshotJson
    ),
    businessDay: row.businessDay,
    settledAt: row.settledAt ?? null,
    createdAt: row.createdAt,
    createdByActorType: row.createdByActorType ?? null,
    createdByActorId: row.createdByActorId ?? null,
    producer: row.producer,
  };
}

export function toSettlementRecordInsertValues(
  record: SettlementRecord
): SettlementRecordInsertValues {
  return {
    settlementRecordId: record.settlementRecordId,
    restaurantId: record.restaurantId,
    recordKind: record.recordKind,
    schemaVersion: record.schemaVersion,
    recordGeneration: record.recordGeneration,
    checkId: record.checkId,
    sessionId: record.sessionId,
    financialReference: record.financialReference,
    priorSettlementRecordId: record.priorSettlementRecordId,
    orderRefsJson: [...record.orderRefs],
    orderSettlementRefsJson: [...record.orderSettlementRefs],
    subtotal: record.subtotal,
    discountAmount: record.discountAmount,
    taxAmount: record.taxAmount,
    grandTotal: record.grandTotal,
    outcome: record.outcome,
    currencySnapshotJson: record.currencySnapshot,
    taxPolicySnapshotJson: record.taxPolicySnapshot,
    taxBreakdownJson: record.taxBreakdown,
    paymentSnapshotJson: [...record.paymentSnapshot],
    businessDay: record.businessDay,
    settledAt: record.settledAt,
    createdAt: record.createdAt,
    createdByActorType: record.createdByActorType,
    createdByActorId: record.createdByActorId,
    producer: record.producer,
  };
}

/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1 / ADR-ARCH-026
 *
 * Read-only Settlement Record adapter for Reporting Platform financial KPIs.
 * Settlement Record is the Canonical Financial Document (publication).
 * Check remains Monetary Aggregate Root — Reporting does not recalculate money.
 */

import { eq } from "drizzle-orm";
import { settlementRecords } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  assertSettlementRecordKind,
  type CheckOutcome,
  type CurrencySnapshot,
  type SettlementPaymentSnapshotLine,
  type TaxPolicySnapshot,
} from "@shared/operational-session";
import type { CheckReportingRow } from "./checkReportingRepository";

export type SettlementRecordReportingQuery = Readonly<{
  restaurantId: number;
  from?: string;
  to?: string;
}>;

/**
 * Reporting fact projected from Settlement Record.
 * Shape-compatible with CheckReportingRow so aggregators stay formula-stable
 * (Revenue = SUM paid grandTotal) without Check table reads.
 */
export type SettlementRecordReportingFact = CheckReportingRow &
  Readonly<{
    settlementRecordId: string;
    recordKind: string;
    businessDay: string;
    paymentSnapshot: readonly SettlementPaymentSnapshotLine[];
    publicationSource: "settlement_record";
  }>;

export type SettlementRecordPaymentReportingLine = Readonly<{
  restaurantId: number;
  checkId: number;
  settlementRecordId: string;
  paymentMethod: string;
  amount: string;
  status: string;
  businessTimestamp: string;
  currencyCode: string;
}>;

function asSnapshot<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function asPaymentSnapshot(value: unknown): SettlementPaymentSnapshotLine[] {
  if (!Array.isArray(value)) return [];
  return value as SettlementPaymentSnapshotLine[];
}

function inDateWindow(
  value: string | null,
  from?: string,
  to?: string
): boolean {
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

/**
 * List Settlement Records for Reporting (tenant + optional settled/created window).
 * Primary settlements + void primary records only (recordGeneration = 1).
 * Compensating generations are excluded from Revenue KPIs (future correction reporting).
 */
export async function listSettlementRecordsForReporting(
  input: SettlementRecordReportingQuery
): Promise<SettlementRecordReportingFact[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(settlementRecords)
    .where(eq(settlementRecords.restaurantId, input.restaurantId));

  const mapped: SettlementRecordReportingFact[] = [];
  for (const row of rows) {
    if (row.recordGeneration !== 1) continue;
    const kind = assertSettlementRecordKind(row.recordKind);
    if (kind !== "settlement" && kind !== "void") continue;

    const outcome = row.outcome as CheckOutcome;
    const settledAt = row.settledAt ?? null;
    const createdAt = row.createdAt;
    const voidedAt =
      outcome === "voided" ? settledAt ?? createdAt : null;

    const fact: SettlementRecordReportingFact = {
      id: row.checkId,
      restaurantId: row.restaurantId,
      sessionId: row.sessionId ?? null,
      outcome,
      grandTotal: String(row.grandTotal ?? "0.00"),
      taxAmount: String(row.taxAmount ?? "0.00"),
      settledAt,
      voidedAt,
      currencySnapshot: asSnapshot(row.currencySnapshotJson, {
        currencyCode: "SAR",
        currencySymbol: "ر.س",
      }) as CurrencySnapshot,
      taxPolicySnapshot: asSnapshot(row.taxPolicySnapshotJson, {
        version: 1,
        enabled: false,
        mode: "exclusive" as const,
        components: [],
      }) as TaxPolicySnapshot,
      settlementRecordId: row.settlementRecordId,
      recordKind: kind,
      businessDay: row.businessDay,
      paymentSnapshot: asPaymentSnapshot(row.paymentSnapshotJson),
      publicationSource: "settlement_record",
    };
    mapped.push(fact);
  }

  if (!input.from && !input.to) {
    return mapped.filter((row) =>
      row.outcome === "voided" ? row.voidedAt != null : row.settledAt != null
    );
  }

  return mapped.filter((row) => {
    if (row.outcome === "voided") {
      return inDateWindow(row.voidedAt, input.from, input.to);
    }
    return inDateWindow(row.settledAt, input.from, input.to);
  });
}

/**
 * Flatten captured payment snapshot lines for Payment Method Analytics.
 * Does not recalculate amounts — copies Settlement Record payment snapshot.
 */
export async function listSettlementRecordPaymentLinesForReporting(
  input: SettlementRecordReportingQuery
): Promise<readonly SettlementRecordPaymentReportingLine[]> {
  const records = await listSettlementRecordsForReporting(input);
  const lines: SettlementRecordPaymentReportingLine[] = [];
  for (const record of records) {
    for (const snap of record.paymentSnapshot) {
      lines.push({
        restaurantId: record.restaurantId,
        checkId: record.id,
        settlementRecordId: record.settlementRecordId,
        paymentMethod: String(snap.paymentMethod),
        amount: String(snap.amount),
        status: String(snap.status ?? "captured"),
        businessTimestamp: snap.businessTimestamp,
        currencyCode: snap.currencyCode,
      });
    }
  }
  return lines;
}

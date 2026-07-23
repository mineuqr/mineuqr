/**
 * REPORTING-PLATFORM-ARCHITECTURE-1 — read-only Check facts.
 *
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1: Canonical financial KPIs read Settlement
 * Record. This repository remains for dual-run parity and
 * REPORTING_FINANCIAL_SOURCE=check emergency rollback only.
 * Does not mutate Check / Session / Order Domain.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { operationalChecks } from "../../drizzle/schema";
import { getDb } from "../db";
import type {
  CheckOutcome,
  CurrencySnapshot,
  TaxPolicySnapshot,
} from "@shared/operational-session";

export type CheckReportingRow = Readonly<{
  id: number;
  restaurantId: number;
  sessionId: number | null;
  outcome: CheckOutcome;
  grandTotal: string;
  taxAmount: string;
  settledAt: string | null;
  voidedAt: string | null;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
}>;

export type CheckReportingQuery = Readonly<{
  restaurantId: number;
  from?: string;
  to?: string;
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

function mapRow(row: {
  id: number;
  restaurantId: number;
  sessionId: number | null;
  outcome: string;
  grandTotal: string;
  taxAmount: string;
  settledAt: string | null;
  voidedAt: string | null;
  currencySnapshotJson: unknown;
  taxPolicySnapshotJson: unknown;
}): CheckReportingRow {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: row.sessionId,
    outcome: row.outcome as CheckOutcome,
    grandTotal: String(row.grandTotal ?? "0.00"),
    taxAmount: String(row.taxAmount ?? "0.00"),
    settledAt: row.settledAt,
    voidedAt: row.voidedAt,
    currencySnapshot: asSnapshot(row.currencySnapshotJson, {
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    }),
    taxPolicySnapshot: asSnapshot(row.taxPolicySnapshotJson, {
      version: 1,
      enabled: false,
      mode: "exclusive" as const,
      components: [],
    }),
  };
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
 * Terminal Checks for a restaurant.
 * Paid/complimentary keyed by settledAt; voided keyed by voidedAt.
 * Date filtering applied in-process after fetch when bounds provided
 * (keeps SQL simple and MySQL/TiDB portable).
 */
export async function listTerminalChecksForReporting(
  input: CheckReportingQuery
): Promise<CheckReportingRow[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: operationalChecks.id,
      restaurantId: operationalChecks.restaurantId,
      sessionId: operationalChecks.sessionId,
      outcome: operationalChecks.outcome,
      grandTotal: operationalChecks.grandTotal,
      taxAmount: operationalChecks.taxAmount,
      settledAt: operationalChecks.settledAt,
      voidedAt: operationalChecks.voidedAt,
      currencySnapshotJson: operationalChecks.currencySnapshotJson,
      taxPolicySnapshotJson: operationalChecks.taxPolicySnapshotJson,
    })
    .from(operationalChecks)
    .where(
      and(
        eq(operationalChecks.restaurantId, input.restaurantId),
        inArray(operationalChecks.outcome, [
          "paid",
          "complimentary",
          "voided",
        ])
      )
    );

  const mapped = rows.map(mapRow);
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

export async function countOperationalChecks(
  restaurantId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(operationalChecks)
    .where(eq(operationalChecks.restaurantId, restaurantId));
  return Number(row?.c ?? 0);
}

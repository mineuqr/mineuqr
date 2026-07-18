/**
 * SETTLEMENT-ARCHITECTURE-1B.1 — settlement analytics foundation.
 *
 * Authoritative fields: dining_sessions.settlementOutcome, settledAt, totalAmount only.
 * Session paidRevenue = SUM(totalAmount) WHERE settlementOutcome = 'paid'.
 * Complimentary sessions never contribute to paidRevenue.
 *
 * REPORTING-KPI-GOVERNANCE-1 — NON-CANONICAL for product Revenue:
 * Canonical Revenue is Check-owned Paid Check SUM(grandTotal) via
 * reporting.getBusinessMetricsSummary (see KPI_DICTIONARY.revenue).
 * This module must not be used as Dashboard / Reports Revenue SSOT.
 */
import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { diningSessions } from "../../drizzle/schema";
import { getDb } from "../db";

export type SettlementOutcome = "paid" | "complimentary";

export type SettlementTrendGrouping = "day" | "week" | "month";

export type SettlementMetricsInput = {
  restaurantId: number;
  /** Inclusive lower bound on settledAt (MySQL datetime or ISO string). */
  from?: string;
  /** Inclusive upper bound on settledAt (MySQL datetime or ISO string). */
  to?: string;
};

export type SettlementTrendInput = SettlementMetricsInput & {
  grouping: SettlementTrendGrouping;
};

export type SettledSessionMetricRow = {
  settlementOutcome: SettlementOutcome;
  settledAt: string;
  totalAmount: string | null;
};

export type SettlementSummary = {
  generatedAt: string;
  paidSessionCount: number;
  complimentarySessionCount: number;
  totalSettledSessions: number;
  paidRevenue: string;
  /** Sum of totalAmount for complimentary sessions — reporting only, not revenue. */
  complimentaryTotalAmount: string;
};

export type SettlementBreakdownItem = {
  outcome: SettlementOutcome;
  sessionCount: number;
  totalAmount: string;
  /** Paid sessions: equals totalAmount; complimentary: always "0.00". */
  revenueContribution: string;
};

export type SettlementBreakdown = {
  generatedAt: string;
  paidRevenue: string;
  items: SettlementBreakdownItem[];
};

export type SettlementTrendPoint = {
  periodKey: string;
  periodStart: string;
  paidSessionCount: number;
  complimentarySessionCount: number;
  paidRevenue: string;
  complimentaryTotalAmount: string;
};

export type SettlementTrend = {
  generatedAt: string;
  grouping: SettlementTrendGrouping;
  points: SettlementTrendPoint[];
};

export class SettlementMetricsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementMetricsValidationError";
  }
}

const SETTLEMENT_OUTCOMES: SettlementOutcome[] = ["paid", "complimentary"];

export function parseSettledTimestampMs(value: string): number {
  const normalized = value.replace(" ", "T") + (value.includes("T") ? "" : "Z");
  return Date.parse(normalized);
}

function parseAmount(value: string | null | undefined): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function assertValidRestaurantId(restaurantId: number): void {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new SettlementMetricsValidationError("Invalid restaurantId");
  }
}

function emptySummary(now: Date): SettlementSummary {
  return {
    generatedAt: now.toISOString(),
    paidSessionCount: 0,
    complimentarySessionCount: 0,
    totalSettledSessions: 0,
    paidRevenue: "0.00",
    complimentaryTotalAmount: "0.00",
  };
}

function emptyBreakdown(now: Date): SettlementBreakdown {
  return {
    generatedAt: now.toISOString(),
    paidRevenue: "0.00",
    items: SETTLEMENT_OUTCOMES.map((outcome) => ({
      outcome,
      sessionCount: 0,
      totalAmount: "0.00",
      revenueContribution: "0.00",
    })),
  };
}

function emptyTrend(now: Date, grouping: SettlementTrendGrouping): SettlementTrend {
  return {
    generatedAt: now.toISOString(),
    grouping,
    points: [],
  };
}

/** ISO-8601 week key (`YYYY-Www`) in UTC. */
export function formatIsoWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function resolvePeriodKey(
  settledAt: string,
  grouping: SettlementTrendGrouping
): string | null {
  const ms = parseSettledTimestampMs(settledAt);
  if (!Number.isFinite(ms)) return null;

  const date = new Date(ms);
  if (grouping === "day") {
    return date.toISOString().slice(0, 10);
  }
  if (grouping === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return formatIsoWeekKey(date);
}

export function resolvePeriodStart(periodKey: string, grouping: SettlementTrendGrouping): string {
  if (grouping === "day") {
    return `${periodKey}T00:00:00.000Z`;
  }
  if (grouping === "month") {
    return `${periodKey}-01T00:00:00.000Z`;
  }

  const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (!match) {
    return periodKey;
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const weekOneMonday = new Date(jan4);
  weekOneMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(weekOneMonday);
  monday.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7);
  return monday.toISOString();
}

export function buildSettlementSummary(
  rows: ReadonlyArray<SettledSessionMetricRow>,
  now: Date = new Date()
): SettlementSummary {
  let paidSessionCount = 0;
  let complimentarySessionCount = 0;
  let paidRevenue = 0;
  let complimentaryTotalAmount = 0;

  for (const row of rows) {
    const amount = parseAmount(row.totalAmount);
    if (row.settlementOutcome === "paid") {
      paidSessionCount += 1;
      paidRevenue += amount;
    } else if (row.settlementOutcome === "complimentary") {
      complimentarySessionCount += 1;
      complimentaryTotalAmount += amount;
    }
  }

  return {
    generatedAt: now.toISOString(),
    paidSessionCount,
    complimentarySessionCount,
    totalSettledSessions: paidSessionCount + complimentarySessionCount,
    paidRevenue: formatAmount(paidRevenue),
    complimentaryTotalAmount: formatAmount(complimentaryTotalAmount),
  };
}

export function buildSettlementBreakdown(
  rows: ReadonlyArray<SettledSessionMetricRow>,
  now: Date = new Date()
): SettlementBreakdown {
  const totals: Record<SettlementOutcome, { count: number; amount: number }> = {
    paid: { count: 0, amount: 0 },
    complimentary: { count: 0, amount: 0 },
  };

  for (const row of rows) {
    const bucket = totals[row.settlementOutcome];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.amount += parseAmount(row.totalAmount);
  }

  const items: SettlementBreakdownItem[] = SETTLEMENT_OUTCOMES.map((outcome) => ({
    outcome,
    sessionCount: totals[outcome].count,
    totalAmount: formatAmount(totals[outcome].amount),
    revenueContribution:
      outcome === "paid" ? formatAmount(totals.paid.amount) : "0.00",
  }));

  return {
    generatedAt: now.toISOString(),
    paidRevenue: formatAmount(totals.paid.amount),
    items,
  };
}

export function buildSettlementTrend(
  rows: ReadonlyArray<SettledSessionMetricRow>,
  grouping: SettlementTrendGrouping,
  now: Date = new Date()
): SettlementTrend {
  const buckets = new Map<
    string,
    {
      paidSessionCount: number;
      complimentarySessionCount: number;
      paidRevenue: number;
      complimentaryTotalAmount: number;
    }
  >();

  for (const row of rows) {
    const periodKey = resolvePeriodKey(row.settledAt, grouping);
    if (!periodKey) continue;

    if (!buckets.has(periodKey)) {
      buckets.set(periodKey, {
        paidSessionCount: 0,
        complimentarySessionCount: 0,
        paidRevenue: 0,
        complimentaryTotalAmount: 0,
      });
    }

    const bucket = buckets.get(periodKey)!;
    const amount = parseAmount(row.totalAmount);

    if (row.settlementOutcome === "paid") {
      bucket.paidSessionCount += 1;
      bucket.paidRevenue += amount;
    } else if (row.settlementOutcome === "complimentary") {
      bucket.complimentarySessionCount += 1;
      bucket.complimentaryTotalAmount += amount;
    }
  }

  const points: SettlementTrendPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, bucket]) => ({
      periodKey,
      periodStart: resolvePeriodStart(periodKey, grouping),
      paidSessionCount: bucket.paidSessionCount,
      complimentarySessionCount: bucket.complimentarySessionCount,
      paidRevenue: formatAmount(bucket.paidRevenue),
      complimentaryTotalAmount: formatAmount(bucket.complimentaryTotalAmount),
    }));

  return {
    generatedAt: now.toISOString(),
    grouping,
    points,
  };
}

async function fetchSettledSessionRows(
  input: SettlementMetricsInput
): Promise<SettledSessionMetricRow[]> {
  assertValidRestaurantId(input.restaurantId);

  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(diningSessions.restaurantId, input.restaurantId),
    isNotNull(diningSessions.settlementOutcome),
    isNotNull(diningSessions.settledAt),
    inArray(diningSessions.settlementOutcome, [...SETTLEMENT_OUTCOMES]),
  ];

  if (input.from) {
    conditions.push(gte(diningSessions.settledAt, input.from));
  }
  if (input.to) {
    conditions.push(lte(diningSessions.settledAt, input.to));
  }

  const rows = await db
    .select({
      settlementOutcome: diningSessions.settlementOutcome,
      settledAt: diningSessions.settledAt,
      totalAmount: diningSessions.totalAmount,
    })
    .from(diningSessions)
    .where(and(...conditions));

  return rows
    .filter(
      (row): row is SettledSessionMetricRow =>
        row.settlementOutcome === "paid" || row.settlementOutcome === "complimentary"
    )
    .map((row) => ({
      settlementOutcome: row.settlementOutcome,
      settledAt: row.settledAt!,
      totalAmount: row.totalAmount,
    }));
}

export async function getSettlementSummary(
  input: SettlementMetricsInput,
  now: Date = new Date()
): Promise<SettlementSummary> {
  try {
    const rows = await fetchSettledSessionRows(input);
    return buildSettlementSummary(rows, now);
  } catch (err) {
    if (err instanceof SettlementMetricsValidationError) {
      return emptySummary(now);
    }
    throw err;
  }
}

export async function getSettlementBreakdown(
  input: SettlementMetricsInput,
  now: Date = new Date()
): Promise<SettlementBreakdown> {
  try {
    const rows = await fetchSettledSessionRows(input);
    return buildSettlementBreakdown(rows, now);
  } catch (err) {
    if (err instanceof SettlementMetricsValidationError) {
      return emptyBreakdown(now);
    }
    throw err;
  }
}

export async function getSettlementTrend(
  input: SettlementTrendInput,
  now: Date = new Date()
): Promise<SettlementTrend> {
  try {
    const rows = await fetchSettledSessionRows(input);
    return buildSettlementTrend(rows, input.grouping, now);
  } catch (err) {
    if (err instanceof SettlementMetricsValidationError) {
      return emptyTrend(now, input.grouping);
    }
    throw err;
  }
}

/**
 * REPORTING-DASHBOARD-ADOPTION-1 — chart row mapping for Business Metrics Trend DTOs.
 * Presentation formatting only — no Revenue calculation.
 */
import type { RouterOutputs } from "@/lib/trpc";

export type BusinessMetricsTrendData =
  RouterOutputs["reporting"]["getBusinessMetricsTrend"];
export type BusinessMetricsTrendPoint = BusinessMetricsTrendData["points"][number];
export type SettlementTrendGrouping = BusinessMetricsTrendData["grouping"];

/** @deprecated Use BusinessMetricsTrendData */
export type SettlementTrendData = BusinessMetricsTrendData;
export type SettlementTrendPoint = BusinessMetricsTrendPoint;

export type SettlementTrendChartRow = {
  periodKey: string;
  periodLabel: string;
  paidRevenue: number;
  paidSessionCount: number;
  complimentarySessionCount: number;
  voidedCount: number;
  totalSettledSessions: number;
  complimentaryRate: number;
};

export type SettlementTrendInsight = {
  periodKey: string;
  periodLabel: string;
  value: number;
  valueLabel: string;
};

export function parseTrendAmount(value: string): number {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatTrendPeriodLabel(
  periodKey: string,
  grouping: SettlementTrendGrouping,
  language: string
): string {
  const isAr = language === "ar";

  if (grouping === "day") {
    const date = new Date(`${periodKey}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return periodKey;
    return date.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  if (grouping === "month") {
    const [year, month] = periodKey.split("-");
    if (!year || !month) return periodKey;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    if (Number.isNaN(date.getTime())) return periodKey;
    return date.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (!match) return periodKey;
  return isAr ? `أسبوع ${match[2]} · ${match[1]}` : `W${match[2]} ${match[1]}`;
}

export function buildSettlementTrendChartRows(
  trend: BusinessMetricsTrendData,
  language: string
): SettlementTrendChartRow[] {
  return trend.points.map((point) => {
    const paidSessionCount = point.paidCheckCount;
    const complimentarySessionCount = point.complimentaryCount;
    const totalSettledSessions = paidSessionCount + complimentarySessionCount;

    return {
      periodKey: point.periodKey,
      periodLabel: formatTrendPeriodLabel(point.periodKey, trend.grouping, language),
      paidRevenue: parseTrendAmount(point.revenue),
      paidSessionCount,
      complimentarySessionCount,
      voidedCount: point.voidedCount,
      totalSettledSessions,
      complimentaryRate:
        totalSettledSessions > 0
          ? (complimentarySessionCount / totalSettledSessions) * 100
          : 0,
    };
  });
}

function findPeakInsight(
  rows: ReadonlyArray<SettlementTrendChartRow>,
  selector: (row: SettlementTrendChartRow) => number,
  formatValue: (row: SettlementTrendChartRow) => string
): SettlementTrendInsight | null {
  if (rows.length === 0) return null;

  let best = rows[0]!;
  for (const row of rows) {
    if (selector(row) > selector(best)) {
      best = row;
    }
  }

  if (selector(best) <= 0) return null;

  return {
    periodKey: best.periodKey,
    periodLabel: best.periodLabel,
    value: selector(best),
    valueLabel: formatValue(best),
  };
}

export function findHighestRevenuePeriod(
  rows: ReadonlyArray<SettlementTrendChartRow>,
  currencySymbol: string
): SettlementTrendInsight | null {
  const sym = currencySymbol || "ر.س";
  return findPeakInsight(
    rows,
    (row) => row.paidRevenue,
    (row) => `${row.paidRevenue.toFixed(2)} ${sym}`
  );
}

export function findHighestSettlementPeriod(
  rows: ReadonlyArray<SettlementTrendChartRow>
): SettlementTrendInsight | null {
  return findPeakInsight(
    rows,
    (row) => row.totalSettledSessions,
    (row) => String(row.totalSettledSessions)
  );
}

export function findHighestComplimentaryPeriod(
  rows: ReadonlyArray<SettlementTrendChartRow>
): SettlementTrendInsight | null {
  return findPeakInsight(
    rows,
    (row) => row.complimentarySessionCount,
    (row) => String(row.complimentarySessionCount)
  );
}

export function isSettlementTrendEmpty(trend: BusinessMetricsTrendData): boolean {
  return trend.points.length === 0;
}

/**
 * REPORTING-DASHBOARD-ADOPTION-1 — presentation formatters for Business Metrics DTOs.
 * No KPI authority — formats Reporting Platform contracts only.
 */
import type { RouterOutputs } from "@/lib/trpc";

export type BusinessMetricsSummaryData =
  RouterOutputs["reporting"]["getBusinessMetricsSummary"];

/** @deprecated Use BusinessMetricsSummaryData — kept alias for gradual import updates. */
export type SettlementSummaryData = BusinessMetricsSummaryData;

export function formatComplimentaryRate(summary: BusinessMetricsSummaryData): string {
  const total = summary.paidCheckCount + summary.complimentaryCount;
  if (total <= 0) return "—";
  const rate = (summary.complimentaryCount / total) * 100;
  return `${rate.toFixed(1)}%`;
}

/** Average Check — already computed by Reporting Platform. */
export function formatAverageCheck(summary: BusinessMetricsSummaryData): string {
  if (summary.paidCheckCount <= 0) return "—";
  return summary.averageCheck;
}

/** @deprecated Prefer formatAverageCheck */
export function formatAveragePaidSessionValue(
  summary: BusinessMetricsSummaryData
): string {
  return formatAverageCheck(summary);
}

export function formatSettlementRevenue(
  revenue: string,
  currencySymbol: string
): string {
  const sym = currencySymbol || "ر.س";
  return `${revenue} ${sym}`;
}

export function resolveReportingCurrencySymbol(
  summary: BusinessMetricsSummaryData | undefined,
  fallback: string
): string {
  return summary?.currency.currencySnapshot?.currencySymbol || fallback || "ر.س";
}

export function isSettlementOverviewEmpty(
  summary: BusinessMetricsSummaryData
): boolean {
  return (
    summary.paidCheckCount <= 0 &&
    summary.complimentaryCount <= 0 &&
    summary.voidedCount <= 0
  );
}

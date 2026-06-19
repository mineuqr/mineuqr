import type { RouterOutputs } from "@/lib/trpc";

export type SettlementSummaryData = RouterOutputs["ops"]["getSettlementSummary"];

export function formatComplimentaryRate(summary: SettlementSummaryData): string {
  if (summary.totalSettledSessions <= 0) {
    return "—";
  }

  const rate = (summary.complimentarySessionCount / summary.totalSettledSessions) * 100;
  return `${rate.toFixed(1)}%`;
}

export function formatAveragePaidSessionValue(summary: SettlementSummaryData): string {
  if (summary.paidSessionCount <= 0) {
    return "—";
  }

  const revenue = Number.parseFloat(summary.paidRevenue);
  if (!Number.isFinite(revenue)) {
    return "—";
  }

  return (revenue / summary.paidSessionCount).toFixed(2);
}

export function formatSettlementRevenue(
  paidRevenue: string,
  currencySymbol: string
): string {
  const sym = currencySymbol || "ر.س";
  return `${paidRevenue} ${sym}`;
}

export function isSettlementOverviewEmpty(summary: SettlementSummaryData): boolean {
  return summary.totalSettledSessions <= 0;
}

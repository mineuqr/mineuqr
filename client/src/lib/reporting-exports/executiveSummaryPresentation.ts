/**
 * REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1
 *
 * Shared Executive Summary KPI selection for Excel + PDF.
 * Presentation only — values come from Reporting DTOs; labels from Product Semantics.
 */

import {
  EXECUTIVE_SUMMARY_KPI_IDS,
  preferredKpiLabel,
  SECTION_TERMINOLOGY,
  type PresentationLanguage,
} from "@shared/reporting-platform";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";
import type { ScopedOrderSalesTotals } from "./scopeTotals";
import { formatNullableCount } from "./format";

export type ExecutiveSummaryCard = Readonly<{
  kpiId: (typeof EXECUTIVE_SUMMARY_KPI_IDS)[number];
  label: string;
  value: string;
}>;

/**
 * Six management-facing KPIs for the Executive Summary.
 * Tax, complimentary, and voided are intentionally omitted (Financial Summary).
 */
export function buildExecutiveSummaryCards(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
}): readonly ExecutiveSummaryCard[] {
  const lang = input.language;
  const { business: biz, orderPeriod, formatMoney } = input;

  const byId: Record<
    (typeof EXECUTIVE_SUMMARY_KPI_IDS)[number],
    string
  > = {
    revenue: formatMoney(biz.revenue),
    orderSales: formatMoney(orderPeriod.orderSales),
    paidCheckCount: formatNullableCount(biz.paidCheckCount),
    orderCount: formatNullableCount(orderPeriod.orderCount),
    averageCheck: formatMoney(biz.averageCheck),
    averageOrder: formatMoney(orderPeriod.averageOrder),
  };

  return EXECUTIVE_SUMMARY_KPI_IDS.map((kpiId) => ({
    kpiId,
    label: preferredKpiLabel(kpiId, lang),
    value: byId[kpiId],
  }));
}

export function executiveSnapshotSectionTitle(
  language: PresentationLanguage
): string {
  return SECTION_TERMINOLOGY[language].executiveSnapshot;
}

export function executiveSnapshotHint(language: PresentationLanguage): string {
  return SECTION_TERMINOLOGY[language].executiveSnapshotHint;
}

/** Tuple form for existing writeKpiCards / pdf kpiCards helpers. */
export function executiveSummaryCardTuples(
  cards: readonly ExecutiveSummaryCard[]
): ReadonlyArray<readonly [string, string]> {
  return cards.map((c) => [c.label, c.value] as const);
}

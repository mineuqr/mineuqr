/**
 * Pure aggregation of financial reporting facts → Business Metrics DTOs.
 * Gross Revenue = SUM(paid gen=1 grandTotal) — Settlement Record publications
 * of finalized Check freeze (ADR-ARCH-026). No money recalculation.
 * REFUND-REPORTING-ADOPTION-1 — Net Revenue = Gross − refund publications.
 */

import type {
  BusinessMetricsSummaryDto,
  BusinessMetricsTrendDto,
  BusinessMetricsTrendPointDto,
  ReportingTrendGrouping,
} from "@shared/reporting-platform";
import {
  REPORTING_CONTRACT_VERSION,
  averageReportingAmount,
  formatReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import type { TaxPolicySnapshot } from "@shared/operational-session";
import type { CheckReportingRow } from "./checkReportingRepository";

/** Business Day period keys (REPORTING-BUSINESS-DAY-ADOPTION-1). */
import {
  formatIsoWeekKeyFromYmd,
  parseReportingInstantMs,
  reportingWorkingHours,
  resolveBusinessPeriodKey,
  resolveBusinessPeriodStart,
  type NormalizedWorkingHours,
} from "@shared/reporting-platform";

export function eventTimestampForCheck(row: CheckReportingRow): string | null {
  if (row.outcome === "voided") return row.voidedAt;
  return row.settledAt;
}

export function buildBusinessMetricsSummary(
  restaurantId: number,
  rows: readonly CheckReportingRow[],
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date()
): BusinessMetricsSummaryDto {
  let revenue = 0;
  let paidCheckCount = 0;
  let taxCollected = 0;
  let complimentaryCount = 0;
  let complimentaryAmount = 0;
  let voidedCount = 0;
  let sampleTax: TaxPolicySnapshot | null = null;
  let currencySnapshot = null as BusinessMetricsSummaryDto["currency"]["currencySnapshot"];

  for (const row of rows) {
    if (row.outcome === "paid") {
      paidCheckCount += 1;
      revenue += parseReportingAmount(row.grandTotal);
      taxCollected += parseReportingAmount(row.taxAmount);
      if (!currencySnapshot) currencySnapshot = row.currencySnapshot;
      if (!sampleTax) sampleTax = row.taxPolicySnapshot;
    } else if (row.outcome === "complimentary") {
      complimentaryCount += 1;
      complimentaryAmount += parseReportingAmount(row.grandTotal);
    } else if (row.outcome === "voided") {
      voidedCount += 1;
    }
  }

  const revenueFormatted = formatReportingAmount(revenue);
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "BusinessMetricsSummary",
    generatedAt: now.toISOString(),
    restaurantId,
    from: from ?? null,
    to: to ?? null,
    revenue: revenueFormatted,
    paidCheckCount,
    averageCheck: averageReportingAmount(revenue, paidCheckCount),
    taxCollected: formatReportingAmount(taxCollected),
    complimentaryCount,
    complimentaryAmount: formatReportingAmount(complimentaryAmount),
    voidedCount,
    refundPublishedTotal: "0.00",
    refundPublicationCount: 0,
    netRevenue: revenueFormatted,
    refundRate: "0.00",
    currency: { currencySnapshot },
    sampleTaxPolicySnapshot: sampleTax,
  };
}

/**
 * REFUND-REPORTING-ADOPTION-1 — attach compensating refund publications.
 * Does not mutate Gross Revenue / tax / paid counts.
 */
export function applyRefundPublicationsToBusinessMetrics(
  summary: BusinessMetricsSummaryDto,
  refundRows: readonly CheckReportingRow[]
): BusinessMetricsSummaryDto {
  let refundPublishedTotal = 0;
  for (const row of refundRows) {
    refundPublishedTotal += parseReportingAmount(row.grandTotal);
  }
  const gross = parseReportingAmount(summary.revenue);
  const net = gross - refundPublishedTotal;
  const refundRate =
    gross > 0 ? (refundPublishedTotal / gross) * 100 : 0;
  return {
    ...summary,
    refundPublishedTotal: formatReportingAmount(refundPublishedTotal),
    refundPublicationCount: refundRows.length,
    netRevenue: formatReportingAmount(net),
    refundRate: (Math.round(refundRate * 100) / 100).toFixed(2),
  };
}

type TrendAcc = {
  periodStart: string;
  revenue: number;
  paidCheckCount: number;
  complimentaryCount: number;
  voidedCount: number;
  taxCollected: number;
  refundPublishedTotal: number;
};

function ensureTrendBucket(
  buckets: Map<string, TrendAcc>,
  periodKey: string,
  grouping: ReportingTrendGrouping,
  workingHours: NormalizedWorkingHours
): TrendAcc {
  let acc = buckets.get(periodKey);
  if (!acc) {
    acc = {
      periodStart: resolveBusinessPeriodStart(
        periodKey,
        grouping,
        undefined,
        workingHours
      ),
      revenue: 0,
      paidCheckCount: 0,
      complimentaryCount: 0,
      voidedCount: 0,
      taxCollected: 0,
      refundPublishedTotal: 0,
    };
    buckets.set(periodKey, acc);
  }
  return acc;
}

export function buildBusinessMetricsTrend(
  restaurantId: number,
  rows: readonly CheckReportingRow[],
  grouping: ReportingTrendGrouping,
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date(),
  workingHours: NormalizedWorkingHours = reportingWorkingHours(null),
  refundRows: readonly CheckReportingRow[] = []
): BusinessMetricsTrendDto {
  const buckets = new Map<string, TrendAcc>();

  for (const row of rows) {
    const ts = eventTimestampForCheck(row);
    if (!ts) continue;
    const periodKey = resolveBusinessPeriodKey(
      ts,
      grouping,
      undefined,
      workingHours
    );
    if (!periodKey) continue;
    const acc = ensureTrendBucket(buckets, periodKey, grouping, workingHours);
    if (row.outcome === "paid") {
      acc.paidCheckCount += 1;
      acc.revenue += parseReportingAmount(row.grandTotal);
      acc.taxCollected += parseReportingAmount(row.taxAmount);
    } else if (row.outcome === "complimentary") {
      acc.complimentaryCount += 1;
    } else if (row.outcome === "voided") {
      acc.voidedCount += 1;
    }
  }

  for (const row of refundRows) {
    const ts = eventTimestampForCheck(row);
    if (!ts) continue;
    const periodKey = resolveBusinessPeriodKey(
      ts,
      grouping,
      undefined,
      workingHours
    );
    if (!periodKey) continue;
    const acc = ensureTrendBucket(buckets, periodKey, grouping, workingHours);
    acc.refundPublishedTotal += parseReportingAmount(row.grandTotal);
  }

  const points: BusinessMetricsTrendPointDto[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, acc]) => ({
      periodKey,
      periodStart: acc.periodStart,
      revenue: formatReportingAmount(acc.revenue),
      paidCheckCount: acc.paidCheckCount,
      complimentaryCount: acc.complimentaryCount,
      voidedCount: acc.voidedCount,
      taxCollected: formatReportingAmount(acc.taxCollected),
      refundPublishedTotal: formatReportingAmount(acc.refundPublishedTotal),
      netRevenue: formatReportingAmount(acc.revenue - acc.refundPublishedTotal),
    }));

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "BusinessMetricsTrend",
    generatedAt: now.toISOString(),
    restaurantId,
    grouping,
    from: from ?? null,
    to: to ?? null,
    points,
  };
}

export { formatIsoWeekKeyFromYmd as formatIsoWeekKey, parseReportingInstantMs as parseSettledTimestampMs };

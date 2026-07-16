/**
 * Pure aggregation of Check reporting rows → Business Metrics DTOs.
 * Revenue = Paid Check grandTotal only.
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

/** Reuse settlement period helpers without adopting Session money SSOT. */
import {
  formatIsoWeekKey,
  parseSettledTimestampMs,
  resolvePeriodKey,
  resolvePeriodStart,
} from "../analytics/settlementMetrics";

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

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "BusinessMetricsSummary",
    generatedAt: now.toISOString(),
    restaurantId,
    from: from ?? null,
    to: to ?? null,
    revenue: formatReportingAmount(revenue),
    paidCheckCount,
    averageCheck: averageReportingAmount(revenue, paidCheckCount),
    taxCollected: formatReportingAmount(taxCollected),
    complimentaryCount,
    complimentaryAmount: formatReportingAmount(complimentaryAmount),
    voidedCount,
    currency: { currencySnapshot },
    sampleTaxPolicySnapshot: sampleTax,
  };
}

type TrendAcc = {
  periodStart: string;
  revenue: number;
  paidCheckCount: number;
  complimentaryCount: number;
  voidedCount: number;
  taxCollected: number;
};

export function buildBusinessMetricsTrend(
  restaurantId: number,
  rows: readonly CheckReportingRow[],
  grouping: ReportingTrendGrouping,
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date()
): BusinessMetricsTrendDto {
  const buckets = new Map<string, TrendAcc>();

  for (const row of rows) {
    const ts = eventTimestampForCheck(row);
    if (!ts) continue;
    const periodKey = resolvePeriodKey(ts, grouping);
    if (!periodKey) continue;
    let acc = buckets.get(periodKey);
    if (!acc) {
      acc = {
        periodStart: resolvePeriodStart(periodKey, grouping),
        revenue: 0,
        paidCheckCount: 0,
        complimentaryCount: 0,
        voidedCount: 0,
        taxCollected: 0,
      };
      buckets.set(periodKey, acc);
    }
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

export { formatIsoWeekKey, parseSettledTimestampMs };

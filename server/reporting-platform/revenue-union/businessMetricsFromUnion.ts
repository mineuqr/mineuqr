/**
 * REVENUE-UNION-PUBLISHED-ADOPTION-1 — map Union totals onto the existing
 * Business Metrics DTO. Does not change KPI names or refund/tax field meaning.
 */

import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";
import {
  REPORTING_CONTRACT_VERSION,
  averageReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import type { RevenueUnionResult } from "@shared/reporting-platform/revenue-union";
import type { CheckReportingRow } from "../checkReportingRepository";

export function businessMetricsSummaryFromUnion(input: {
  restaurantId: number;
  from?: string;
  to?: string;
  union: RevenueUnionResult;
  sampleRows: readonly CheckReportingRow[];
  now?: Date;
}): BusinessMetricsSummaryDto {
  const now = input.now ?? new Date();
  const excluded = new Set(input.union.excludedLegacyIds);
  const sample =
    input.sampleRows.find((row) => {
      const id = `check:${row.restaurantId}:${row.id}`;
      return row.outcome === "paid" && !excluded.has(id);
    }) ??
    input.sampleRows.find((row) => {
      const id = `check:${row.restaurantId}:${row.id}`;
      return !excluded.has(id);
    });

  const gross = parseReportingAmount(input.union.totals.grossRevenue);
  const refund = parseReportingAmount(input.union.totals.refundPublishedTotal);
  const refundRate = gross > 0 ? (refund / gross) * 100 : 0;

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "BusinessMetricsSummary",
    generatedAt: now.toISOString(),
    restaurantId: input.restaurantId,
    from: input.from ?? null,
    to: input.to ?? null,
    revenue: input.union.totals.grossRevenue,
    paidCheckCount: input.union.totals.paidContributionCount,
    averageCheck: averageReportingAmount(
      gross,
      input.union.totals.paidContributionCount
    ),
    taxCollected: input.union.totals.taxCollected,
    complimentaryCount: input.union.totals.complimentaryCount,
    complimentaryAmount: input.union.totals.complimentaryAmount,
    voidedCount: input.union.totals.voidedCount,
    refundPublishedTotal: input.union.totals.refundPublishedTotal,
    refundPublicationCount: input.union.totals.refundPublicationCount,
    netRevenue: input.union.totals.netRevenue,
    refundRate: (Math.round(refundRate * 100) / 100).toFixed(2),
    currency: { currencySnapshot: sample?.currencySnapshot ?? null },
    sampleTaxPolicySnapshot: sample?.taxPolicySnapshot ?? null,
  };
}

export function filterReportingRowsByUnion(input: {
  rows: readonly CheckReportingRow[];
  union: RevenueUnionResult;
}): CheckReportingRow[] {
  const excluded = new Set(input.union.excludedLegacyIds);
  const seen = new Set<string>();
  const out: CheckReportingRow[] = [];
  for (const row of input.rows) {
    const id = `check:${row.restaurantId}:${row.id}`;
    if (excluded.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

/** Dual-run field names only — no money values in the returned list. */
export function unionPublicationMismatchFields(
  legacy: BusinessMetricsSummaryDto,
  published: BusinessMetricsSummaryDto
): readonly string[] {
  const fields: Array<keyof BusinessMetricsSummaryDto> = [
    "revenue",
    "netRevenue",
    "taxCollected",
    "paidCheckCount",
    "complimentaryCount",
    "complimentaryAmount",
    "voidedCount",
    "refundPublishedTotal",
    "refundPublicationCount",
  ];
  return fields.filter((field) => String(legacy[field]) !== String(published[field]));
}

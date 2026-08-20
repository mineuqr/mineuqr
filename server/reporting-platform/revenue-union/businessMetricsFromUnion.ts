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
import {
  collectionContributionId,
  type RevenueUnionCollectionFact,
  type RevenueUnionResult,
} from "@shared/reporting-platform/revenue-union";
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
  const excluded = reportingExclusionSet(input.union, {
    retainProductionOverlapLegacy: true,
  });
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

function reportingExclusionSet(
  union: RevenueUnionResult,
  options: { retainProductionOverlapLegacy?: boolean } = {}
): Set<string> {
  const excluded = new Set(union.excludedLegacyIds);
  if (options.retainProductionOverlapLegacy) {
    for (const id of union.productionOverlapExcludedLegacyIds) {
      excluded.delete(id);
    }
  }
  return excluded;
}

export function filterReportingRowsByUnion(input: {
  rows: readonly CheckReportingRow[];
  union: RevenueUnionResult;
  retainProductionOverlapLegacy?: boolean;
}): CheckReportingRow[] {
  const excluded = reportingExclusionSet(input.union, {
    retainProductionOverlapLegacy: input.retainProductionOverlapLegacy,
  });
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

function collectionFactToTrendRow(
  fact: RevenueUnionCollectionFact
): CheckReportingRow {
  return {
    id: 0,
    restaurantId: fact.restaurantId,
    sessionId: null,
    outcome: "paid",
    grandTotal: fact.amount,
    taxAmount: fact.taxAmount,
    settledAt: `${fact.businessDay} 12:00:00`,
    voidedAt: null,
    currencySnapshot: fact.currencySnapshot,
    taxPolicySnapshot: fact.taxPolicySnapshot,
  };
}

/**
 * Trend rows from the published Union: keep overlapping SR rows (CF won,
 * money already proven compatible) so refunds/gross do not disappear, and
 * append Collection Fact-only contributions the SR list does not contain.
 */
export function publishedTrendRowsFromUnion(input: {
  rows: readonly CheckReportingRow[];
  refundRows: readonly CheckReportingRow[];
  facts: readonly RevenueUnionCollectionFact[];
  union: RevenueUnionResult;
}): {
  grossRows: CheckReportingRow[];
  refundRows: CheckReportingRow[];
} {
  const grossRows = filterReportingRowsByUnion({
    rows: input.rows,
    union: input.union,
    retainProductionOverlapLegacy: true,
  });
  const overlapFactIds = new Set(
    input.union.conflicts
      .filter((conflict) => conflict.code === "PRODUCTION_OVERLAP")
      .map((conflict) => conflict.contributionId.split("|")[1])
      .filter((id): id is string => Boolean(id))
  );
  const publishedFactIds = new Set(
    input.union.contributions
      .filter((row) => row.authority === "COLLECTION_FACT")
      .map((row) => row.contributionId)
  );
  for (const fact of input.facts) {
    const id = collectionContributionId(fact);
    if (!publishedFactIds.has(id) || overlapFactIds.has(id)) continue;
    grossRows.push(collectionFactToTrendRow(fact));
  }
  return {
    grossRows,
    refundRows: filterReportingRowsByUnion({
      rows: input.refundRows,
      union: input.union,
      retainProductionOverlapLegacy: true,
    }),
  };
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

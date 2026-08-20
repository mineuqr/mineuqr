/**
 * REVENUE-UNION-ADOPTION-1 — Gross Union formula (shadow).
 *
 * Gross =
 *   Σ paid LEGACY_CHECK grandTotal (non-conflict)
 * + Σ eligible COLLECTION_FACT amount (non-conflict, kind=collection)
 *
 * Net = Gross − Σ legacy refund publications (Check/SR compensating docs).
 * Collection Fact refunds are not in the current fact contract (documented gap).
 */

import { formatReportingAmount, parseReportingAmount } from "../reportingMoney";
import { formatIsoWeekKeyFromYmd } from "../timeSeries/calendar";
import type { ReportingTrendGrouping } from "../reportingContracts";
import type {
  CollectionFactEligibility,
  RevenueUnionCollectionFact,
  RevenueUnionLegacyFact,
  RevenueUnionRefundFact,
  RevenueUnionResult,
  RevenueUnionTotals,
} from "./revenueUnionContract";
import { REVENUE_UNION_PROGRAM_ID } from "./revenueUnionContract";
import { resolveRevenueUnionSets } from "./revenueUnionResolver";

export function periodKeyFromFrozenBusinessDay(
  businessDay: string,
  grouping: ReportingTrendGrouping
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDay)) return null;
  switch (grouping) {
    case "day":
      return businessDay;
    case "week":
      return formatIsoWeekKeyFromYmd(businessDay);
    case "month":
      return businessDay.slice(0, 7);
  }
}

export function computeRevenueUnion(input: {
  legacy: readonly RevenueUnionLegacyFact[];
  facts: readonly RevenueUnionCollectionFact[];
  refunds?: readonly RevenueUnionRefundFact[];
  eligibility: CollectionFactEligibility;
}): RevenueUnionResult {
  const resolved = resolveRevenueUnionSets(input);
  const excludedLegacy = resolved.excludedLegacyIds;
  const overlapExcludedLegacy = resolved.productionOverlapExcludedLegacyIds;

  let legacyGross = 0;
  let collectionFactGross = 0;
  let taxCollected = 0;
  let legacyPaidCount = 0;
  let collectionFactCount = 0;
  let complimentaryCount = 0;
  let complimentaryAmount = 0;
  let voidedCount = 0;

  for (const row of resolved.contributions) {
    if (row.authority === "LEGACY_CHECK") {
      if (row.outcome === "paid") {
        legacyPaidCount += 1;
        legacyGross += parseReportingAmount(row.amount);
        taxCollected += parseReportingAmount(row.taxAmount);
      } else if (row.outcome === "complimentary") {
        complimentaryCount += 1;
        complimentaryAmount += parseReportingAmount(row.amount);
      } else if (row.outcome === "voided") {
        voidedCount += 1;
      }
    } else {
      collectionFactCount += 1;
      collectionFactGross += parseReportingAmount(row.amount);
      taxCollected += parseReportingAmount(row.taxAmount);
    }
  }

  let refundPublishedTotal = 0;
  let refundPublicationCount = 0;
  for (const refund of input.refunds ?? []) {
    const id = `check:${refund.restaurantId}:${refund.checkId}`;
    if (excludedLegacy.has(id) && !overlapExcludedLegacy.has(id)) continue;
    refundPublishedTotal += parseReportingAmount(refund.grandTotal);
    refundPublicationCount += 1;
  }

  const gross = legacyGross + collectionFactGross;
  const totals: RevenueUnionTotals = {
    grossRevenue: formatReportingAmount(gross),
    legacyGross: formatReportingAmount(legacyGross),
    collectionFactGross: formatReportingAmount(collectionFactGross),
    taxCollected: formatReportingAmount(taxCollected),
    paidContributionCount: legacyPaidCount + collectionFactCount,
    legacyPaidCount,
    collectionFactCount,
    complimentaryCount,
    complimentaryAmount: formatReportingAmount(complimentaryAmount),
    voidedCount,
    refundPublishedTotal: formatReportingAmount(refundPublishedTotal),
    refundPublicationCount,
    netRevenue: formatReportingAmount(gross - refundPublishedTotal),
  };

  return {
    programId: REVENUE_UNION_PROGRAM_ID,
    eligibility: input.eligibility,
    totals,
    contributions: resolved.contributions,
    conflicts: resolved.conflicts,
    excludedLegacyIds: [...resolved.excludedLegacyIds],
    excludedFactIds: [...resolved.excludedFactIds],
    productionOverlapExcludedLegacyIds: [
      ...resolved.productionOverlapExcludedLegacyIds,
    ],
    eligibilityRejectedFactCount: resolved.eligibilityRejectedFactCount,
    unresolvedCount: resolved.unresolvedCount,
    productionOverlapCount: resolved.productionOverlapCount,
  };
}

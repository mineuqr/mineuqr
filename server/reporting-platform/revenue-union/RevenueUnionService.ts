/**
 * REVENUE-UNION-ADOPTION-1 / REVENUE-UNION-PUBLISHED-ADOPTION-1
 * Union mapping + dual-run comparison helpers.
 *
 * Does not write Collection Facts.
 * Does not change PAID, Cashier, or Settlement.
 * Production Collection Fact overlap is resolved in the Union engine only.
 */

import type { CheckReportingRow } from "../checkReportingRepository";
import type { SettlementRecordReportingFact } from "../settlementRecordReportingAdapter";
import {
  compareLegacyToUnion,
  computeRevenueUnion,
  resolveLegacyOrderIdsForOverlap,
  type CollectionFactEligibility,
  type RevenueUnionCollectionFact,
  type RevenueUnionLegacyFact,
  type RevenueUnionRefundFact,
  type RevenueUnionResult,
} from "@shared/reporting-platform/revenue-union";
import { buildBusinessMetricsSummary } from "../businessMetricsAggregator";
import { listCollectionFactsForRevenueUnion } from "./collectionFactReportingAdapter";
import {
  listRefundSettlementRecordsForReporting,
  listSettlementRecordsForReporting,
} from "../settlementRecordReportingAdapter";
import type { CheckTerminalOutcome } from "@shared/operational-session";
import { listActiveOrderIdsByCheckIds } from "../../operational-session/check/checkOrderMembershipRepository";

function toPublishedCheckOutcome(
  outcome: CheckReportingRow["outcome"]
): CheckTerminalOutcome {
  if (outcome === "paid" || outcome === "complimentary" || outcome === "voided") {
    return outcome;
  }
  throw new Error(
    `Revenue Union legacy facts require a terminal Check outcome (got ${outcome})`
  );
}

export function toRevenueUnionLegacyFact(
  row: CheckReportingRow,
  extras: {
    settlementRecordId?: string | null;
    businessDay?: string | null;
    orderingChannel?: string | null;
    orderIds?: readonly number[];
  } = {}
): RevenueUnionLegacyFact {
  return {
    restaurantId: row.restaurantId,
    checkId: row.id,
    settlementRecordId: extras.settlementRecordId ?? null,
    outcome: toPublishedCheckOutcome(row.outcome),
    grandTotal: row.grandTotal,
    taxAmount: row.taxAmount,
    currencyCode: row.currencySnapshot.currencyCode,
    currencySnapshot: row.currencySnapshot,
    taxPolicySnapshot: row.taxPolicySnapshot,
    businessDay: extras.businessDay ?? null,
    settledAt: row.settledAt,
    voidedAt: row.voidedAt,
    orderingChannel: extras.orderingChannel ?? null,
    orderIds: extras.orderIds ?? [],
  };
}

export function toRevenueUnionLegacyFromSettlement(
  row: SettlementRecordReportingFact,
  extras: { orderingChannel?: string | null; orderIds?: readonly number[] } = {}
): RevenueUnionLegacyFact {
  const fromRecord = row.orderRefs.map((ref) => ref.orderId);
  return toRevenueUnionLegacyFact(row, {
    settlementRecordId: row.settlementRecordId,
    businessDay: row.businessDay,
    orderingChannel: extras.orderingChannel ?? null,
    orderIds: extras.orderIds ?? fromRecord,
  });
}

function isSettlementRecordReportingFact(
  row: CheckReportingRow
): row is SettlementRecordReportingFact {
  return (
    "publicationSource" in row &&
    (row as SettlementRecordReportingFact).publicationSource ===
      "settlement_record"
  );
}

/**
 * SR-OVERLAP-IDENTITY-HARDENING-1
 * Read-only batch membership for SR rows whose frozen orderRefs are empty.
 * Failure fails closed (empty map) so an independent sale is never suppressed.
 */
export async function loadMembershipOrderIdsForEmptySettlementRefs(
  restaurantId: number,
  rows: readonly CheckReportingRow[]
): Promise<ReadonlyMap<number, readonly number[]>> {
  const checkIds = rows
    .filter(isSettlementRecordReportingFact)
    .filter((row) => row.orderRefs.length === 0)
    .map((row) => row.id);
  if (checkIds.length === 0) return new Map();
  try {
    return await listActiveOrderIdsByCheckIds(restaurantId, checkIds);
  } catch {
    return new Map();
  }
}

export function toRevenueUnionLegacyFromSettlementWithOverlapIdentity(
  row: SettlementRecordReportingFact,
  membershipOrderIds: readonly number[] = []
): RevenueUnionLegacyFact {
  return toRevenueUnionLegacyFromSettlement(row, {
    orderIds: resolveLegacyOrderIdsForOverlap({
      frozenOrderIds: row.orderRefs.map((ref) => ref.orderId),
      membershipOrderIds,
    }),
  });
}

export function toRevenueUnionRefundFact(
  row: CheckReportingRow,
  extras: { settlementRecordId?: string | null; businessDay?: string | null } = {}
): RevenueUnionRefundFact {
  return {
    restaurantId: row.restaurantId,
    checkId: row.id,
    settlementRecordId: extras.settlementRecordId ?? null,
    grandTotal: row.grandTotal,
    settledAt: row.settledAt,
    businessDay: extras.businessDay ?? null,
  };
}

/**
 * Shadow Union from already-loaded facts. Isolated eligibility counts Collection Facts.
 * Published eligibility ignores isolated facts so Union Gross = legacy Gross.
 */
export function computeShadowRevenueUnion(input: {
  legacy: readonly RevenueUnionLegacyFact[];
  facts?: readonly RevenueUnionCollectionFact[];
  refunds?: readonly RevenueUnionRefundFact[];
  eligibility?: CollectionFactEligibility;
}): RevenueUnionResult {
  return computeRevenueUnion({
    legacy: input.legacy,
    facts: input.facts ?? [],
    refunds: input.refunds,
    eligibility: input.eligibility ?? "isolated",
  });
}

/**
 * Production-safe dual-run: load SR (legacy publication) + Collection Facts,
 * compute Union with eligibility=published and isolated (shadow).
 * Zero Collection Fact rows → both equal legacy.
 */
export async function comparePublishedLegacyToShadowUnion(input: {
  restaurantId: number;
  from?: string;
  to?: string;
}): Promise<{
  legacySummaryRevenue: string;
  publishedUnion: RevenueUnionResult;
  shadowUnion: RevenueUnionResult;
  publishedMatchesLegacy: boolean;
}> {
  const [srRows, refundRows, facts] = await Promise.all([
    listSettlementRecordsForReporting(input),
    listRefundSettlementRecordsForReporting(input),
    listCollectionFactsForRevenueUnion({
      restaurantId: input.restaurantId,
      from: input.from,
      to: input.to,
    }),
  ]);
  const membershipByCheckId = await loadMembershipOrderIdsForEmptySettlementRefs(
    input.restaurantId,
    srRows
  );
  const legacy = srRows.map((row) =>
    toRevenueUnionLegacyFromSettlementWithOverlapIdentity(
      row,
      membershipByCheckId.get(row.id) ?? []
    )
  );
  const refunds = refundRows.map((row) =>
    toRevenueUnionRefundFact(row, {
      settlementRecordId: row.settlementRecordId,
      businessDay: row.businessDay,
    })
  );
  const publishedUnion = computeShadowRevenueUnion({
    legacy,
    facts,
    refunds,
    eligibility: "published",
  });
  const shadowUnion = computeShadowRevenueUnion({
    legacy,
    facts,
    refunds,
    eligibility: "isolated",
  });
  const legacySummary = buildBusinessMetricsSummary(
    input.restaurantId,
    srRows,
    input.from,
    input.to
  );
  const mismatches = compareLegacyToUnion({
    legacyGross: legacySummary.revenue,
    legacyTax: legacySummary.taxCollected,
    legacyPaidCount: legacySummary.paidCheckCount,
    union: publishedUnion,
  });
  return {
    legacySummaryRevenue: legacySummary.revenue,
    publishedUnion,
    shadowUnion,
    publishedMatchesLegacy: mismatches.length === 0,
  };
}

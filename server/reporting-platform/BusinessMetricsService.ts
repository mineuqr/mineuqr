/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1
 * REFUND-REPORTING-ADOPTION-1
 * REVENUE-UNION-PUBLISHED-ADOPTION-1
 * CF-NATIVE-REPORTING-1
 *
 * Business KPIs — published Revenue resolves through Revenue Union.
 * Current Cashier Gross: production Collection Fact.
 * Historical Gross without CF: Settlement Record gen=1 (Check emergency rollback).
 * Refunds remain compensating Settlement Records.
 * Never reads live Business Settings for tax/currency.
 */

import type {
  BusinessMetricsSummaryDto,
  BusinessMetricsTrendDto,
  ReportingPeriodInput,
  ReportingTrendGrouping,
} from "@shared/reporting-platform";
import { computeRevenueUnion } from "@shared/reporting-platform/revenue-union";
import { listTerminalChecksForReporting } from "./checkReportingRepository";
import type { CheckReportingRow } from "./checkReportingRepository";
import {
  applyRefundPublicationsToBusinessMetrics,
  buildBusinessMetricsSummary,
  buildBusinessMetricsTrend,
} from "./businessMetricsAggregator";
import { compareBusinessMetricsParity } from "./financialReportingParity";
import { resolveFinancialReportingSourceMode } from "./financialReportingSource";
import { resolveRevenueUnionPublicationMode } from "./revenueUnionPublication";
import { loadRestaurantWorkingHoursForReporting } from "./restaurantWorkingHoursAdapter";
import {
  listRefundSettlementRecordsForReporting,
  listSettlementRecordsForReporting,
  type SettlementRecordReportingFact,
} from "./settlementRecordReportingAdapter";
import { opsLog } from "../_core/opsLog";
import { listCollectionFactsForRevenueUnion } from "./revenue-union/collectionFactReportingAdapter";
import {
  toRevenueUnionLegacyFact,
  toRevenueUnionLegacyFromSettlementWithOverlapIdentity,
  toRevenueUnionRefundFact,
  loadMembershipOrderIdsForEmptySettlementRefs,
} from "./revenue-union/RevenueUnionService";
import {
  businessMetricsSummaryFromUnion,
  publishedTrendRowsFromUnion,
  unionPublicationMismatchFields,
} from "./revenue-union/businessMetricsFromUnion";
import type {
  RevenueUnionCollectionFact,
  RevenueUnionResult,
} from "@shared/reporting-platform/revenue-union";

export class ReportingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportingValidationError";
  }
}

function assertRestaurantId(restaurantId: number): void {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }
}

function isSettlementRecordFact(
  row: CheckReportingRow
): row is SettlementRecordReportingFact {
  return (
    "publicationSource" in row &&
    (row as SettlementRecordReportingFact).publicationSource ===
      "settlement_record"
  );
}

function toUnionLegacyRows(
  rows: readonly CheckReportingRow[],
  membershipByCheckId: ReadonlyMap<number, readonly number[]> = new Map()
) {
  return rows.map((row) =>
    isSettlementRecordFact(row)
      ? toRevenueUnionLegacyFromSettlementWithOverlapIdentity(
          row,
          membershipByCheckId.get(row.id) ?? []
        )
      : toRevenueUnionLegacyFact(row)
  );
}

function toUnionRefundRows(rows: readonly CheckReportingRow[]) {
  return rows.map((row) =>
    isSettlementRecordFact(row)
      ? toRevenueUnionRefundFact(row, {
          settlementRecordId: row.settlementRecordId,
          businessDay: row.businessDay,
        })
      : toRevenueUnionRefundFact(row)
  );
}

function unionObservabilityCounts(union: RevenueUnionResult) {
  const unresolvedMessages = union.conflicts
    .filter((conflict) => conflict.code === "UNRESOLVED")
    .map((conflict) => conflict.message);
  return {
    bothCount: union.conflicts.filter((conflict) => conflict.code === "BOTH")
      .length,
    productionOverlapResolvedCount: union.productionOverlapCount,
    unresolvedCount: union.unresolvedCount,
    unresolvedProductionOverlapCount: unresolvedMessages.filter((message) =>
      /economic overlap|exclusive economic-sale|Duplicate Production Collection Facts collide/i.test(
        message
      )
    ).length,
    duplicateProductionCollectionFactCount: union.conflicts.filter(
      (conflict) => conflict.code === "DUPLICATE_FACT"
    ).length,
    invalidProductionCollectionFactCount: unresolvedMessages.filter((message) =>
      /failed authority validation/i.test(message)
    ).length,
    legacyExcludedByProductionOverlapCount:
      union.productionOverlapExcludedLegacyIds.length,
    eligibilityRejectedFactCount: union.eligibilityRejectedFactCount,
    collectionFactContributionCount: union.totals.collectionFactCount,
  };
}

function logUnionPublicationObservability(input: {
  restaurantId: number;
  from?: string;
  to?: string;
  bothCount: number;
  productionOverlapResolvedCount: number;
  unresolvedCount: number;
  unresolvedProductionOverlapCount: number;
  duplicateProductionCollectionFactCount: number;
  invalidProductionCollectionFactCount: number;
  legacyExcludedByProductionOverlapCount: number;
  eligibilityRejectedFactCount: number;
  collectionFactContributionCount: number;
  mismatchFields: readonly string[];
}): void {
  const hasSignal =
    input.bothCount > 0 ||
    input.productionOverlapResolvedCount > 0 ||
    input.unresolvedCount > 0 ||
    input.unresolvedProductionOverlapCount > 0 ||
    input.duplicateProductionCollectionFactCount > 0 ||
    input.invalidProductionCollectionFactCount > 0 ||
    input.legacyExcludedByProductionOverlapCount > 0 ||
    input.eligibilityRejectedFactCount > 0 ||
    input.collectionFactContributionCount > 0 ||
    input.mismatchFields.length > 0;
  if (!hasSignal) return;
  const severity: "warn" | "info" =
    input.bothCount > 0 ||
    input.unresolvedCount > 0 ||
    input.unresolvedProductionOverlapCount > 0 ||
    input.duplicateProductionCollectionFactCount > 0 ||
    input.invalidProductionCollectionFactCount > 0 ||
    input.mismatchFields.length > 0
      ? "warn"
      : "info";
  opsLog({
    type: "reporting_revenue_union_publication",
    category: "SYSTEM",
    severity,
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    metadata: {
      from: input.from ?? null,
      to: input.to ?? null,
      bothCount: input.bothCount,
      productionOverlapResolved: input.productionOverlapResolvedCount,
      unresolvedProductionOverlap: input.unresolvedProductionOverlapCount,
      duplicateProductionCollectionFact:
        input.duplicateProductionCollectionFactCount,
      invalidProductionCollectionFact: input.invalidProductionCollectionFactCount,
      legacyExcludedBecauseProductionCollectionFactWon:
        input.legacyExcludedByProductionOverlapCount,
      unresolvedCount: input.unresolvedCount,
      eligibilityRejectedFactCount: input.eligibilityRejectedFactCount,
      collectionFactContributionCount: input.collectionFactContributionCount,
      mismatchFieldCount: input.mismatchFields.length,
      mismatchFields: input.mismatchFields,
    },
  });
}

async function loadFinancialFacts(input: ReportingPeriodInput) {
  const mode = resolveFinancialReportingSourceMode();
  if (mode === "check") {
    return {
      mode,
      rows: await listTerminalChecksForReporting(input),
      parity: null as ReturnType<typeof compareBusinessMetricsParity> | null,
    };
  }

  const srRows = await listSettlementRecordsForReporting(input);
  if (mode === "dual") {
    const checkRows = await listTerminalChecksForReporting(input);
    const srSummary = buildBusinessMetricsSummary(
      input.restaurantId,
      srRows,
      input.from,
      input.to
    );
    const checkSummary = buildBusinessMetricsSummary(
      input.restaurantId,
      checkRows,
      input.from,
      input.to
    );
    const parity = compareBusinessMetricsParity(checkSummary, srSummary);
    if (!parity.matched) {
      opsLog({
        type: "reporting_financial_parity_mismatch",
        category: "SYSTEM",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        metadata: {
          from: input.from ?? null,
          to: input.to ?? null,
          deltas: parity.deltas,
        },
      });
    }
    return { mode, rows: srRows, parity };
  }

  return { mode, rows: srRows, parity: null };
}

async function loadPublishedUnionInputs(input: ReportingPeriodInput) {
  const [{ rows }, refundRows, facts] = await Promise.all([
    loadFinancialFacts(input),
    listRefundSettlementRecordsForReporting(input),
    listCollectionFactsForRevenueUnion({
      restaurantId: input.restaurantId,
      from: input.from,
      to: input.to,
    }),
  ]);
  const membershipByCheckId = await loadMembershipOrderIdsForEmptySettlementRefs(
    input.restaurantId,
    rows
  );
  return { rows, refundRows, facts, membershipByCheckId };
}

function computePublishedUnion(
  rows: readonly CheckReportingRow[],
  refundRows: readonly CheckReportingRow[],
  facts: readonly RevenueUnionCollectionFact[],
  membershipByCheckId: ReadonlyMap<number, readonly number[]> = new Map()
) {
  return computeRevenueUnion({
    legacy: toUnionLegacyRows(rows, membershipByCheckId),
    facts,
    refunds: toUnionRefundRows(refundRows),
    eligibility: "published",
  });
}

/**
 * Business KPIs — Revenue Union publication path (REVENUE-UNION-PUBLISHED-ADOPTION-1).
 * Period filtering uses caller from/to (Business Day bounds from client/server).
 * Refund publications remain compensating Settlement Records.
 * Collection Fact rows are read for authority resolution; isolated purposes never publish.
 */
export async function getBusinessMetricsSummary(
  input: ReportingPeriodInput
): Promise<BusinessMetricsSummaryDto> {
  assertRestaurantId(input.restaurantId);
  if (resolveRevenueUnionPublicationMode() === "legacy") {
    const [{ rows }, refundRows] = await Promise.all([
      loadFinancialFacts(input),
      listRefundSettlementRecordsForReporting(input),
    ]);
    const gross = buildBusinessMetricsSummary(
      input.restaurantId,
      rows,
      input.from,
      input.to
    );
    return applyRefundPublicationsToBusinessMetrics(gross, refundRows);
  }

  const { rows, refundRows, facts, membershipByCheckId } =
    await loadPublishedUnionInputs(input);
  const union = computePublishedUnion(
    rows,
    refundRows,
    facts,
    membershipByCheckId
  );
  const published = businessMetricsSummaryFromUnion({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
    union,
    sampleRows: rows,
  });
  const legacyGross = buildBusinessMetricsSummary(
    input.restaurantId,
    rows,
    input.from,
    input.to
  );
  const legacyPublished = applyRefundPublicationsToBusinessMetrics(
    legacyGross,
    refundRows
  );
  logUnionPublicationObservability({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
    ...unionObservabilityCounts(union),
    mismatchFields: unionPublicationMismatchFields(legacyPublished, published),
  });
  return published;
}

export async function getBusinessMetricsTrend(
  input: ReportingPeriodInput & { grouping: ReportingTrendGrouping }
): Promise<BusinessMetricsTrendDto> {
  assertRestaurantId(input.restaurantId);
  if (resolveRevenueUnionPublicationMode() === "legacy") {
    const [{ rows }, workingHours, refundRows] = await Promise.all([
      loadFinancialFacts(input),
      loadRestaurantWorkingHoursForReporting(input.restaurantId),
      listRefundSettlementRecordsForReporting(input),
    ]);
    return buildBusinessMetricsTrend(
      input.restaurantId,
      rows,
      input.grouping,
      input.from,
      input.to,
      new Date(),
      workingHours,
      refundRows
    );
  }

  const [{ rows, refundRows, facts, membershipByCheckId }, workingHours] =
    await Promise.all([
      loadPublishedUnionInputs(input),
      loadRestaurantWorkingHoursForReporting(input.restaurantId),
    ]);
  const union = computePublishedUnion(
    rows,
    refundRows,
    facts,
    membershipByCheckId
  );
  const publishedTrend = publishedTrendRowsFromUnion({
    rows,
    refundRows,
    facts,
    union,
  });
  logUnionPublicationObservability({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
    ...unionObservabilityCounts(union),
    mismatchFields: [],
  });
  return buildBusinessMetricsTrend(
    input.restaurantId,
    publishedTrend.grossRows,
    input.grouping,
    input.from,
    input.to,
    new Date(),
    workingHours,
    publishedTrend.refundRows
  );
}

/** Test / diagnostics: dual-run parity for Business Metrics (Gross fields). */
export async function getBusinessMetricsParityDiagnostic(
  input: ReportingPeriodInput
): Promise<{
  matched: boolean;
  deltas: ReturnType<typeof compareBusinessMetricsParity>["deltas"];
  settlementRecord: BusinessMetricsSummaryDto;
  legacyCheck: BusinessMetricsSummaryDto;
}> {
  assertRestaurantId(input.restaurantId);
  const [srRows, checkRows, refundRows] = await Promise.all([
    listSettlementRecordsForReporting(input),
    listTerminalChecksForReporting(input),
    listRefundSettlementRecordsForReporting(input),
  ]);
  const settlementRecord = applyRefundPublicationsToBusinessMetrics(
    buildBusinessMetricsSummary(
      input.restaurantId,
      srRows,
      input.from,
      input.to
    ),
    refundRows
  );
  const legacyCheck = applyRefundPublicationsToBusinessMetrics(
    buildBusinessMetricsSummary(
      input.restaurantId,
      checkRows,
      input.from,
      input.to
    ),
    refundRows
  );
  const parity = compareBusinessMetricsParity(legacyCheck, settlementRecord);
  return {
    matched: parity.matched,
    deltas: parity.deltas,
    settlementRecord,
    legacyCheck,
  };
}

/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1
 * REFUND-REPORTING-ADOPTION-1
 * REVENUE-UNION-PUBLISHED-ADOPTION-1
 *
 * Business KPIs — published Revenue resolves through Revenue Union.
 * Legacy authority remains Settlement Record gen=1 (or Check emergency source).
 * Collection Fact contribution is published-eligibility gated (allowlist empty).
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
  toRevenueUnionLegacyFromSettlement,
  toRevenueUnionRefundFact,
} from "./revenue-union/RevenueUnionService";
import {
  businessMetricsSummaryFromUnion,
  filterReportingRowsByUnion,
  unionPublicationMismatchFields,
} from "./revenue-union/businessMetricsFromUnion";
import type { RevenueUnionCollectionFact } from "@shared/reporting-platform/revenue-union";

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

function toUnionLegacyRows(rows: readonly CheckReportingRow[]) {
  return rows.map((row) =>
    isSettlementRecordFact(row)
      ? toRevenueUnionLegacyFromSettlement(row)
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

function logUnionPublicationObservability(input: {
  restaurantId: number;
  from?: string;
  to?: string;
  bothCount: number;
  unresolvedCount: number;
  duplicateCount: number;
  eligibilityRejectedFactCount: number;
  collectionFactContributionCount: number;
  mismatchFields: readonly string[];
}): void {
  const hasSignal =
    input.bothCount > 0 ||
    input.unresolvedCount > 0 ||
    input.duplicateCount > 0 ||
    input.eligibilityRejectedFactCount > 0 ||
    input.collectionFactContributionCount > 0 ||
    input.mismatchFields.length > 0;
  if (!hasSignal) return;
  opsLog({
    type: "reporting_revenue_union_publication",
    category: "SYSTEM",
    severity:
      input.bothCount > 0 ||
      input.unresolvedCount > 0 ||
      input.mismatchFields.length > 0
        ? "warn"
        : "info",
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    metadata: {
      from: input.from ?? null,
      to: input.to ?? null,
      bothCount: input.bothCount,
      unresolvedCount: input.unresolvedCount,
      duplicateCount: input.duplicateCount,
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
    listCollectionFactsForRevenueUnion({ restaurantId: input.restaurantId }),
  ]);
  return { rows, refundRows, facts };
}

function computePublishedUnion(
  rows: readonly CheckReportingRow[],
  refundRows: readonly CheckReportingRow[],
  facts: readonly RevenueUnionCollectionFact[]
) {
  return computeRevenueUnion({
    legacy: toUnionLegacyRows(rows),
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

  const { rows, refundRows, facts } = await loadPublishedUnionInputs(input);
  const union = computePublishedUnion(rows, refundRows, facts);
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
    bothCount: union.conflicts.filter((c) => c.code === "BOTH").length,
    unresolvedCount: union.unresolvedCount,
    duplicateCount: union.conflicts.filter(
      (c) => c.code === "DUPLICATE_LEGACY" || c.code === "DUPLICATE_FACT"
    ).length,
    eligibilityRejectedFactCount: union.eligibilityRejectedFactCount,
    collectionFactContributionCount: union.totals.collectionFactCount,
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

  const [{ rows, refundRows, facts }, workingHours] = await Promise.all([
    loadPublishedUnionInputs(input),
    loadRestaurantWorkingHoursForReporting(input.restaurantId),
  ]);
  const union = computePublishedUnion(rows, refundRows, facts);
  const publishedRows = filterReportingRowsByUnion({ rows, union });
  const publishedRefunds = filterReportingRowsByUnion({
    rows: refundRows,
    union,
  });
  logUnionPublicationObservability({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
    bothCount: union.conflicts.filter((c) => c.code === "BOTH").length,
    unresolvedCount: union.unresolvedCount,
    duplicateCount: union.conflicts.filter(
      (c) => c.code === "DUPLICATE_LEGACY" || c.code === "DUPLICATE_FACT"
    ).length,
    eligibilityRejectedFactCount: union.eligibilityRejectedFactCount,
    collectionFactContributionCount: union.totals.collectionFactCount,
    mismatchFields: [],
  });
  return buildBusinessMetricsTrend(
    input.restaurantId,
    publishedRows,
    input.grouping,
    input.from,
    input.to,
    new Date(),
    workingHours,
    publishedRefunds
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

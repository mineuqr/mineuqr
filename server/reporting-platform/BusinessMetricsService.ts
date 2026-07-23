/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1
 *
 * Business KPIs — Settlement Record is the canonical financial publication source.
 * Check remains Monetary Aggregate Root; Reporting aggregates published grandTotal/tax.
 * Never reads live Business Settings for tax/currency.
 */

import type {
  BusinessMetricsSummaryDto,
  BusinessMetricsTrendDto,
  ReportingPeriodInput,
  ReportingTrendGrouping,
} from "@shared/reporting-platform";
import { listTerminalChecksForReporting } from "./checkReportingRepository";
import {
  buildBusinessMetricsSummary,
  buildBusinessMetricsTrend,
} from "./businessMetricsAggregator";
import { compareBusinessMetricsParity } from "./financialReportingParity";
import { resolveFinancialReportingSourceMode } from "./financialReportingSource";
import { loadRestaurantWorkingHoursForReporting } from "./restaurantWorkingHoursAdapter";
import { listSettlementRecordsForReporting } from "./settlementRecordReportingAdapter";
import { opsLog } from "../_core/opsLog";

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

/**
 * Business KPIs — Settlement Record publication path (ADR-ARCH-026 Phase D).
 * Period filtering uses caller from/to (Business Day bounds from client/server).
 */
export async function getBusinessMetricsSummary(
  input: ReportingPeriodInput
): Promise<BusinessMetricsSummaryDto> {
  assertRestaurantId(input.restaurantId);
  const { rows } = await loadFinancialFacts(input);
  return buildBusinessMetricsSummary(
    input.restaurantId,
    rows,
    input.from,
    input.to
  );
}

export async function getBusinessMetricsTrend(
  input: ReportingPeriodInput & { grouping: ReportingTrendGrouping }
): Promise<BusinessMetricsTrendDto> {
  assertRestaurantId(input.restaurantId);
  const [{ rows }, workingHours] = await Promise.all([
    loadFinancialFacts(input),
    loadRestaurantWorkingHoursForReporting(input.restaurantId),
  ]);
  return buildBusinessMetricsTrend(
    input.restaurantId,
    rows,
    input.grouping,
    input.from,
    input.to,
    new Date(),
    workingHours
  );
}

/** Test / diagnostics: dual-run parity for Business Metrics. */
export async function getBusinessMetricsParityDiagnostic(
  input: ReportingPeriodInput
): Promise<{
  matched: boolean;
  deltas: ReturnType<typeof compareBusinessMetricsParity>["deltas"];
  settlementRecord: BusinessMetricsSummaryDto;
  legacyCheck: BusinessMetricsSummaryDto;
}> {
  assertRestaurantId(input.restaurantId);
  const [srRows, checkRows] = await Promise.all([
    listSettlementRecordsForReporting(input),
    listTerminalChecksForReporting(input),
  ]);
  const settlementRecord = buildBusinessMetricsSummary(
    input.restaurantId,
    srRows,
    input.from,
    input.to
  );
  const legacyCheck = buildBusinessMetricsSummary(
    input.restaurantId,
    checkRows,
    input.from,
    input.to
  );
  const parity = compareBusinessMetricsParity(legacyCheck, settlementRecord);
  return {
    matched: parity.matched,
    deltas: parity.deltas,
    settlementRecord,
    legacyCheck,
  };
}

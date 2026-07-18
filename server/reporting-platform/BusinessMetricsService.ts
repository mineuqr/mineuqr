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
import { loadRestaurantWorkingHoursForReporting } from "./restaurantWorkingHoursAdapter";

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

/**
 * Business KPIs — Check Domain is Revenue SSOT.
 * Never reads live Business Settings for tax/currency.
 * Period filtering uses caller from/to (Business Day bounds from client/server).
 * Trend bucketing uses restaurant Business Day opening hours.
 */
export async function getBusinessMetricsSummary(
  input: ReportingPeriodInput
): Promise<BusinessMetricsSummaryDto> {
  assertRestaurantId(input.restaurantId);
  const rows = await listTerminalChecksForReporting(input);
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
  const [rows, workingHours] = await Promise.all([
    listTerminalChecksForReporting(input),
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

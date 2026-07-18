/**
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — canonical comparison framework.
 *
 * Presentation MUST consume ComparisonDto / buildMetricComparison results.
 * Presentation MUST NEVER compute growth %, delta, or trend direction.
 */

import { formatReportingAmount, parseReportingAmount } from "../reportingMoney";
import type { ComparisonDto, TrendDirectionDto } from "./contracts";
import type { ComparisonStrategy, TimeRange, TrendDirection } from "./types";
import {
  businessCalendarMonthReportingBounds,
  businessCalendarYearReportingBounds,
  REPORTING_BUSINESS_TIMEZONE,
} from "./calendar";
import {
  businessDayReportingBoundsForDay,
  reportingWorkingHours,
  type NormalizedWorkingHours,
} from "./businessDayReporting";
import type { TimeSeriesGranularity } from "./granularity";

const FLAT_EPSILON = 0.005;

export function resolveTrendDirection(
  delta: number,
  epsilon: number = FLAT_EPSILON
): TrendDirection {
  if (Math.abs(delta) < epsilon) return "flat";
  return delta > 0 ? "up" : "down";
}

export function computeDelta(current: number, previous: number): number {
  return current - previous;
}

/**
 * Growth percent: ((current - previous) / |previous|) * 100.
 * When previous is 0: null (undefined growth).
 */
export function computeGrowthPercent(
  current: number,
  previous: number
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildMetricComparison(input: {
  strategy: ComparisonStrategy;
  currentValue: string | number;
  previousValue: string | number;
  currentRange: TimeRange;
  previousRange: TimeRange;
  metricId?: string;
}): ComparisonDto {
  const current = parseReportingAmount(String(input.currentValue));
  const previous = parseReportingAmount(String(input.previousValue));
  const delta = computeDelta(current, previous);
  const growth = computeGrowthPercent(current, previous);
  const direction = resolveTrendDirection(delta);

  return {
    contractId: "Comparison",
    strategy: input.strategy,
    metricId: input.metricId ?? null,
    currentRange: input.currentRange,
    previousRange: input.previousRange,
    currentValue: formatReportingAmount(current),
    previousValue: formatReportingAmount(previous),
    delta: formatReportingAmount(delta),
    growthPercent:
      growth === null ? null : (Math.round(growth * 100) / 100).toFixed(2),
    trendDirection: direction as TrendDirectionDto,
  };
}

function shiftYearMonth(
  year: number,
  month: number,
  deltaMonths: number
): { year: number; month: number } {
  let y = year;
  let m = month + deltaMonths;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

/**
 * Resolve the comparison baseline range for a Business Day window.
 * previous_business_period and previous_period are equivalent for months/years.
 * REPORTING-BUSINESS-DAY-ADOPTION-1 — opening → next opening (not wall midnight).
 */
export function resolveComparisonRange(input: {
  strategy: ComparisonStrategy;
  granularity: TimeSeriesGranularity;
  year: number;
  month?: number;
  timeZone?: string;
  workingHours?: NormalizedWorkingHours;
}): TimeRange {
  const tz = input.timeZone ?? REPORTING_BUSINESS_TIMEZONE;
  const hours = input.workingHours ?? reportingWorkingHours(null);

  if (input.strategy === "previous_year") {
    if (input.granularity === "year") {
      return businessCalendarYearReportingBounds(input.year - 1, tz, hours);
    }
    if (input.granularity === "month" && input.month != null) {
      return businessCalendarMonthReportingBounds(
        input.year - 1,
        input.month,
        tz,
        hours
      );
    }
    if (input.granularity === "quarter" && input.month != null) {
      const qStart = Math.floor((input.month - 1) / 3) * 3 + 1;
      const from = businessCalendarMonthReportingBounds(
        input.year - 1,
        qStart,
        tz,
        hours
      );
      const to = businessCalendarMonthReportingBounds(
        input.year - 1,
        qStart + 2,
        tz,
        hours
      );
      return { from: from.from, to: to.to };
    }
  }

  // previous_period / previous_business_period
  if (input.granularity === "month" && input.month != null) {
    const prev = shiftYearMonth(input.year, input.month, -1);
    return businessCalendarMonthReportingBounds(
      prev.year,
      prev.month,
      tz,
      hours
    );
  }
  if (input.granularity === "year") {
    return businessCalendarYearReportingBounds(input.year - 1, tz, hours);
  }
  if (input.granularity === "quarter" && input.month != null) {
    const qStart = Math.floor((input.month - 1) / 3) * 3 + 1;
    const prev = shiftYearMonth(input.year, qStart, -3);
    const from = businessCalendarMonthReportingBounds(
      prev.year,
      prev.month,
      tz,
      hours
    );
    const to = businessCalendarMonthReportingBounds(
      prev.year,
      prev.month + 2,
      tz,
      hours
    );
    return { from: from.from, to: to.to };
  }

  // Day / week / hour: previous Business Day relative to the first day of the month.
  const ymd = `${input.year}-${String(input.month ?? 1).padStart(2, "0")}-01`;
  const [y, mo, d] = ymd.split("-").map(Number);
  const prev = new Date(Date.UTC(y!, mo! - 1, d! - 1));
  const prevKey = prev.toISOString().slice(0, 10);
  return businessDayReportingBoundsForDay(prevKey, hours, tz);
}

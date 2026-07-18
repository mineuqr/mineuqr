/**
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — canonical granularities.
 *
 * Every reporting service must use these definitions. No ad-hoc period strings.
 */

export const TIME_SERIES_PROGRAM_ID =
  "REPORTING-TIME-SERIES-ARCHITECTURE-1" as const;

/** Supported business time-series granularities. */
export const TIME_SERIES_GRANULARITIES = [
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
] as const;

export type TimeSeriesGranularity = (typeof TIME_SERIES_GRANULARITIES)[number];

/**
 * Subset exposed by Check trend / legacy ReportingTrendGrouping APIs.
 * Full set remains available for rollups and future analytics.
 */
export const REPORTING_TREND_GRANULARITIES = ["day", "week", "month"] as const;

export type ReportingTrendGranularity =
  (typeof REPORTING_TREND_GRANULARITIES)[number];

export function isTimeSeriesGranularity(
  value: string
): value is TimeSeriesGranularity {
  return (TIME_SERIES_GRANULARITIES as readonly string[]).includes(value);
}

export function isReportingTrendGranularity(
  value: string
): value is ReportingTrendGranularity {
  return (REPORTING_TREND_GRANULARITIES as readonly string[]).includes(value);
}

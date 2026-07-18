/**
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — domain model (non-DTO).
 *
 * KPI Governance defines WHAT is measured.
 * Time Series Architecture defines HOW measurements are aggregated over time.
 */

import type { TimeSeriesGranularity } from "./granularity";

/** Inclusive business reporting window (stored UTC datetimes or ISO instants). */
export type TimeRange = Readonly<{
  from: string | null;
  to: string | null;
}>;

/** One aggregated bucket in a series. */
export type TimeBucket = Readonly<{
  /** Canonical period key for the granularity (see calendar module). */
  periodKey: string;
  /** Inclusive bucket start as UTC ISO instant. */
  periodStart: string;
  granularity: TimeSeriesGranularity;
}>;

/** Aggregation strategy for numeric series points. */
export type AggregationStrategy =
  | "sum"
  | "count"
  | "avg"
  | "last"
  | "max"
  | "min";

/** How a comparison baseline is selected. */
export type ComparisonStrategy =
  | "previous_period"
  | "previous_business_period"
  | "previous_year";

export type TrendDirection = "up" | "down" | "flat";

/** In-memory series before DTO projection. */
export type TimeSeries<TMetrics extends Record<string, unknown> = Record<string, unknown>> =
  Readonly<{
    metricId: string;
    granularity: TimeSeriesGranularity;
    range: TimeRange;
    aggregation: AggregationStrategy;
    buckets: readonly (TimeBucket & { metrics: TMetrics })[];
  }>;

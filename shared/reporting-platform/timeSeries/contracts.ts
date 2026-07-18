/**
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — canonical DTOs.
 *
 * Existing BusinessMetricsTrendDto / OrderSalesRollupDto remain backward-compatible
 * product contracts. These DTOs are the official time-series layer contracts.
 */

import { REPORTING_CONTRACT_VERSION } from "../reportingContracts";
import type { AggregationStrategy, ComparisonStrategy, TimeRange } from "./types";
import type { TimeSeriesGranularity } from "./granularity";

export type TrendDirectionDto = "up" | "down" | "flat";

export type TimeBucketDto = Readonly<{
  periodKey: string;
  periodStart: string;
  granularity: TimeSeriesGranularity;
}>;

export type TrendPointDto = Readonly<{
  periodKey: string;
  periodStart: string;
  /** Primary series value (formatted decimal string for money metrics). */
  value: string;
  /** Optional secondary numeric measures already computed by Reporting Platform. */
  measures?: Readonly<Record<string, string | number>>;
}>;

export type TimeSeriesDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "TimeSeries";
  programId: "REPORTING-TIME-SERIES-ARCHITECTURE-1";
  generatedAt: string;
  restaurantId: number;
  metricId: string;
  granularity: TimeSeriesGranularity;
  aggregation: AggregationStrategy;
  from: string | null;
  to: string | null;
  points: readonly TrendPointDto[];
}>;

export type ComparisonDto = Readonly<{
  contractId: "Comparison";
  strategy: ComparisonStrategy;
  metricId: string | null;
  currentRange: TimeRange;
  previousRange: TimeRange;
  currentValue: string;
  previousValue: string;
  delta: string;
  /** Null when previous is 0 and current is non-zero (undefined growth). */
  growthPercent: string | null;
  trendDirection: TrendDirectionDto;
}>;

export type ChartSeriesPointDto = Readonly<{
  periodKey: string;
  label: string;
  value: number;
}>;

export type ChartSeriesDto = Readonly<{
  contractId: "ChartSeries";
  metricId: string;
  granularity: TimeSeriesGranularity;
  points: readonly ChartSeriesPointDto[];
}>;

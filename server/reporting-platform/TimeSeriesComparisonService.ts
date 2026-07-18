/**
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — comparison façade.
 * Presentation consumes ComparisonDto; never computes growth/delta itself.
 */

import {
  buildMetricComparison,
  resolveComparisonRange,
  type ComparisonDto,
  type ComparisonStrategy,
  type TimeSeriesGranularity,
} from "@shared/reporting-platform";

export function compareMetricValues(input: {
  strategy: ComparisonStrategy;
  currentValue: string;
  previousValue: string;
  currentFrom?: string | null;
  currentTo?: string | null;
  previousFrom?: string | null;
  previousTo?: string | null;
  metricId?: string;
}): ComparisonDto {
  return buildMetricComparison({
    strategy: input.strategy,
    currentValue: input.currentValue,
    previousValue: input.previousValue,
    currentRange: {
      from: input.currentFrom ?? null,
      to: input.currentTo ?? null,
    },
    previousRange: {
      from: input.previousFrom ?? null,
      to: input.previousTo ?? null,
    },
    metricId: input.metricId,
  });
}

export function getComparisonBaselineRange(input: {
  strategy: ComparisonStrategy;
  granularity: TimeSeriesGranularity;
  year: number;
  month?: number;
}) {
  return resolveComparisonRange(input);
}

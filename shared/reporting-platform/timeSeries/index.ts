export {
  TIME_SERIES_PROGRAM_ID,
  TIME_SERIES_GRANULARITIES,
  REPORTING_TREND_GRANULARITIES,
  isTimeSeriesGranularity,
  isReportingTrendGranularity,
  type TimeSeriesGranularity,
  type ReportingTrendGranularity,
} from "./granularity";

export type {
  TimeRange,
  TimeBucket,
  AggregationStrategy,
  ComparisonStrategy,
  TrendDirection,
  TimeSeries,
} from "./types";

export {
  REPORTING_BUSINESS_TIMEZONE,
  parseReportingInstantMs,
  resolveBusinessPeriodKey,
  resolveBusinessPeriodStart,
  formatIsoWeekKeyFromYmd,
  businessWallToUtcInstant,
  businessWallPartsFromInstant,
  businessTodayKey,
  businessCurrentYearMonth,
  businessCalendarMonthReportingBounds,
  businessCalendarYearReportingBounds,
  formatStoredUtcDatetime,
  restaurantYearMonth,
  type BusinessWallParts,
} from "./calendar";

export {
  resolveTrendDirection,
  computeDelta,
  computeGrowthPercent,
  buildMetricComparison,
  resolveComparisonRange,
} from "./comparison";

export type {
  TrendDirectionDto,
  TimeBucketDto,
  TrendPointDto,
  TimeSeriesDto,
  ComparisonDto,
  ChartSeriesPointDto,
  ChartSeriesDto,
} from "./contracts";

export {
  businessTrendToTimeSeriesDto,
  orderSalesRollupToTimeSeriesDto,
  timeSeriesToChartSeriesDto,
} from "./adapters";

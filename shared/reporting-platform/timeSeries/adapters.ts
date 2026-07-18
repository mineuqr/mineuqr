/**
 * Adapters from existing Reporting DTOs → canonical Time Series DTOs.
 * No KPI recalculation — projection only.
 */

import { REPORTING_CONTRACT_VERSION } from "../reportingContracts";
import type {
  BusinessMetricsTrendDto,
  OrderSalesRollupDto,
} from "../reportingContracts";
import { parseReportingAmount } from "../reportingMoney";
import type { ChartSeriesDto, TimeSeriesDto } from "./contracts";
import { TIME_SERIES_PROGRAM_ID } from "./granularity";
import type { TimeSeriesGranularity } from "./granularity";

export function businessTrendToTimeSeriesDto(
  trend: BusinessMetricsTrendDto,
  metricId: string = "revenue"
): TimeSeriesDto {
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "TimeSeries",
    programId: TIME_SERIES_PROGRAM_ID,
    generatedAt: trend.generatedAt,
    restaurantId: trend.restaurantId,
    metricId,
    granularity: trend.grouping as TimeSeriesGranularity,
    aggregation: "sum",
    from: trend.from,
    to: trend.to,
    points: trend.points.map((p) => ({
      periodKey: p.periodKey,
      periodStart: p.periodStart,
      value: p.revenue,
      measures: {
        paidCheckCount: p.paidCheckCount,
        complimentaryCount: p.complimentaryCount,
        voidedCount: p.voidedCount,
        taxCollected: p.taxCollected,
      },
    })),
  };
}

export function orderSalesRollupToTimeSeriesDto(
  rollup: OrderSalesRollupDto,
  metricId: string = "orderSales"
): TimeSeriesDto {
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "TimeSeries",
    programId: TIME_SERIES_PROGRAM_ID,
    generatedAt: rollup.generatedAt,
    restaurantId: rollup.restaurantId,
    metricId,
    granularity: rollup.granularity as TimeSeriesGranularity,
    aggregation: "sum",
    from: null,
    to: null,
    points: rollup.periods.map((p) => ({
      periodKey: p.periodKey,
      periodStart: `${p.periodKey.length === 7 ? `${p.periodKey}-01` : p.periodKey}T00:00:00.000Z`,
      value: p.orderSales,
      measures: {
        orderCount: p.orderCount,
        completedOrders: p.completedOrders,
      },
    })),
  };
}

/** Chart projection — numeric values only; labels supplied by presentation. */
export function timeSeriesToChartSeriesDto(
  series: TimeSeriesDto,
  labelForPeriod: (periodKey: string) => string = (k) => k
): ChartSeriesDto {
  return {
    contractId: "ChartSeries",
    metricId: series.metricId,
    granularity: series.granularity,
    points: series.points.map((p) => ({
      periodKey: p.periodKey,
      label: labelForPeriod(p.periodKey),
      value: parseReportingAmount(p.value),
    })),
  };
}

import type {
  OrderSalesPeriodDto,
  OrderSalesRollupDto,
  OrderSalesSummaryDto,
} from "@shared/reporting-platform";
import {
  REPORTING_CONTRACT_VERSION,
  averageReportingAmount,
  businessCurrentYearMonth,
  businessTodayKey,
  formatReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import {
  listAnalyticsDaysInMonth,
  listAnalyticsDaysInRange,
  readAnalyticsDay,
  type AnalyticsDayRow,
} from "./orderReadReportingAdapter";
import { ReportingValidationError } from "./BusinessMetricsService";

function emptyPeriod(): OrderSalesPeriodDto {
  return {
    totalOrders: 0,
    completedOrders: 0,
    orderSales: "0.00",
    averageOrder: "0.00",
  };
}

function sumDays(days: readonly AnalyticsDayRow[]): OrderSalesPeriodDto {
  let totalOrders = 0;
  let completedOrders = 0;
  let sales = 0;
  for (const d of days) {
    totalOrders += d.orderCount;
    completedOrders += d.completedOrderCount;
    sales += parseReportingAmount(d.completedSales);
  }
  return {
    totalOrders,
    completedOrders,
    orderSales: formatReportingAmount(sales),
    averageOrder: averageReportingAmount(sales, completedOrders),
  };
}

/**
 * Order Sales KPIs — Order Read Analytics Projection (P-10).
 * Explicitly NOT Revenue.
 *
 * "Today" / current month selection uses Business Calendar (APP_TIMEZONE).
 * dayKey values themselves remain Order Read projection ownership.
 */
export async function getOrderSalesSummary(
  restaurantId: number,
  now: Date = new Date()
): Promise<OrderSalesSummaryDto> {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }

  const todayKey = businessTodayKey(now);
  const { year, month } = businessCurrentYearMonth(now);

  const [todayRow, monthRows] = await Promise.all([
    readAnalyticsDay(restaurantId, todayKey),
    listAnalyticsDaysInMonth(restaurantId, year, month),
  ]);

  const today = todayRow ? sumDays([todayRow]) : emptyPeriod();
  const monthPeriod = monthRows.length ? sumDays(monthRows) : emptyPeriod();

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "OrderSalesSummary",
    generatedAt: now.toISOString(),
    restaurantId,
    today,
    month: monthPeriod,
  };
}

export async function getOrderSalesRollup(input: {
  restaurantId: number;
  granularity: "day" | "month";
  year: number;
  month?: number;
}): Promise<OrderSalesRollupDto> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }

  if (input.granularity === "day") {
    const month = input.month ?? 1;
    const days = await listAnalyticsDaysInMonth(
      input.restaurantId,
      input.year,
      month
    );
    return {
      contractVersion: REPORTING_CONTRACT_VERSION,
      contractId: "OrderSalesRollup",
      generatedAt: new Date().toISOString(),
      restaurantId: input.restaurantId,
      granularity: "day",
      periods: days
        .slice()
        .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
        .map((d) => ({
          periodKey: d.dayKey,
          orderCount: d.orderCount,
          completedOrders: d.completedOrderCount,
          orderSales: d.completedSales,
        })),
    };
  }

  // Month granularity: aggregate each month in the year from day keys YYYY-MM-*
  const from = `${input.year}-01-01`;
  const to = `${input.year}-12-31`;
  const days = await listAnalyticsDaysInRange(input.restaurantId, from, to);
  const byMonth = new Map<
    string,
    { orderCount: number; completedOrders: number; sales: number }
  >();
  for (const d of days) {
    const key = d.dayKey.slice(0, 7);
    const acc = byMonth.get(key) ?? {
      orderCount: 0,
      completedOrders: 0,
      sales: 0,
    };
    acc.orderCount += d.orderCount;
    acc.completedOrders += d.completedOrderCount;
    acc.sales += parseReportingAmount(d.completedSales);
    byMonth.set(key, acc);
  }

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "OrderSalesRollup",
    generatedAt: new Date().toISOString(),
    restaurantId: input.restaurantId,
    granularity: "month",
    periods: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, acc]) => ({
        periodKey,
        orderCount: acc.orderCount,
        completedOrders: acc.completedOrders,
        orderSales: formatReportingAmount(acc.sales),
      })),
  };
}

/**
 * REPORTING-PERIOD-CONSISTENCY-1
 * Presentation totals for the selected reporting scope only.
 *
 * Order Sales period KPIs are derived from OrderSalesRollup (already scoped),
 * never from OrderSalesSummary.month (live UTC current month).
 *
 * Aggregation is display-only over DTO fields — no new KPI authority.
 */
import type {
  BusinessMetricsTrendDto,
  OrderSalesRollupDto,
} from "@shared/reporting-platform";
import { parseDtoAmountForDisplay } from "./format";

export type ScopedOrderSalesTotals = Readonly<{
  orderSales: string;
  orderCount: number;
  completedOrders: number;
  averageOrder: string;
}>;

export type ScopedRevenueTotals = Readonly<{
  revenue: string;
  paidCheckCount: number;
  taxCollected: string;
}>;

function amountToFixed2(value: number): string {
  return value.toFixed(2);
}

/** Sum Order Sales rollup periods for the export's selected month/year. */
export function scopedOrderSalesFromRollup(
  rollup: OrderSalesRollupDto
): ScopedOrderSalesTotals {
  let orderSales = 0;
  let orderCount = 0;
  let completedOrders = 0;
  for (const p of rollup.periods) {
    orderSales += parseDtoAmountForDisplay(p.orderSales);
    orderCount += p.orderCount;
    completedOrders += p.completedOrders;
  }
  const averageOrder =
    completedOrders > 0 ? orderSales / completedOrders : 0;
  return {
    orderSales: amountToFixed2(orderSales),
    orderCount,
    completedOrders,
    averageOrder: amountToFixed2(averageOrder),
  };
}

/** Sum Revenue trend points for the export's selected month/year. */
export function scopedRevenueFromTrend(
  trend: BusinessMetricsTrendDto
): ScopedRevenueTotals {
  let revenue = 0;
  let paidCheckCount = 0;
  let taxCollected = 0;
  for (const p of trend.points) {
    revenue += parseDtoAmountForDisplay(p.revenue);
    paidCheckCount += p.paidCheckCount;
    taxCollected += parseDtoAmountForDisplay(p.taxCollected);
  }
  return {
    revenue: amountToFixed2(revenue),
    paidCheckCount,
    taxCollected: amountToFixed2(taxCollected),
  };
}

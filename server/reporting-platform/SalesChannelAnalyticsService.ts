/**
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 / ORDERING-CHANNEL-GOVERNANCE-1
 *
 * Sales Channel Analytics from Order Read (served orders) + OrderingChannelId stamp.
 * Consumes OrderingChannelId only — no identityScope inference.
 * Operational Order Sales plane — does NOT replace Total Sales (Check Revenue)
 * or Payment Method Analytics. Does not recalculate order totals.
 */

import {
  REPORTING_CONTRACT_VERSION,
  formatReportingAmount,
  parseReportingAmount,
  type ReportingPeriodInput,
  type SalesChannelAnalyticsBucketDto,
  type SalesChannelAnalyticsDto,
} from "@shared/reporting-platform";
import {
  REPORTING_SALES_CHANNEL_CATALOG,
  reportingSalesChannelLabel,
  resolveReportingSalesChannel,
} from "@shared/ordering-platform";
import { ReportingValidationError } from "./BusinessMetricsService";
import { listServedOrdersForChannelReporting } from "./orderReadReportingAdapter";

type Acc = { orderCount: number; sales: number };

function emptyAcc(): Acc {
  return { orderCount: 0, sales: 0 };
}

function mixPercent(part: number, whole: number): string {
  if (whole <= 0) return "0.00";
  return (Math.round((part / whole) * 10000) / 100).toFixed(2);
}

/**
 * Pure builder — aggregates served order lines into channel buckets.
 * UI / Excel MUST consume the DTO; no presentation aggregation.
 */
export function buildSalesChannelAnalyticsFromOrderLines(
  input: ReportingPeriodInput,
  rows: readonly Readonly<{
    orderingChannel: string | null;
    totalAmount: string;
  }>[],
  language: "en" | "ar" = "en"
): SalesChannelAnalyticsDto {
  const byChannel = new Map<string, Acc>();
  for (const id of REPORTING_SALES_CHANNEL_CATALOG) {
    byChannel.set(id, emptyAcc());
  }

  for (const row of rows) {
    const channelId = resolveReportingSalesChannel({
      orderingChannel: row.orderingChannel,
    });
    const acc = byChannel.get(channelId) ?? emptyAcc();
    acc.orderCount += 1;
    acc.sales += parseReportingAmount(row.totalAmount);
    byChannel.set(channelId, acc);
  }

  // Future / unknown channels already in map from resolve — ensure presence.
  for (const [channelId] of byChannel) {
    if (!byChannel.has(channelId)) byChannel.set(channelId, emptyAcc());
  }

  let totalSales = 0;
  let totalOrders = 0;
  for (const acc of byChannel.values()) {
    totalSales += acc.sales;
    totalOrders += acc.orderCount;
  }

  const catalogSet = new Set<string>(REPORTING_SALES_CHANNEL_CATALOG);
  const buckets: SalesChannelAnalyticsBucketDto[] = [...byChannel.entries()]
    .filter(
      ([channelId, acc]) =>
        catalogSet.has(channelId) || acc.orderCount > 0 || acc.sales > 0
    )
    .sort(([a], [b]) => {
      const ai = REPORTING_SALES_CHANNEL_CATALOG.indexOf(
        a as (typeof REPORTING_SALES_CHANNEL_CATALOG)[number]
      );
      const bi = REPORTING_SALES_CHANNEL_CATALOG.indexOf(
        b as (typeof REPORTING_SALES_CHANNEL_CATALOG)[number]
      );
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    })
    .map(([channelId, acc]) => ({
      channelId,
      channelName: reportingSalesChannelLabel(channelId, language),
      orderCount: acc.orderCount,
      salesAmount: formatReportingAmount(acc.sales),
      salesMixPercent: mixPercent(acc.sales, totalSales),
      orderMixPercent: mixPercent(acc.orderCount, totalOrders),
    }));

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "SalesChannelAnalytics",
    programId: "REPORTING-SALES-CHANNEL-ANALYTICS-1",
    generatedAt: new Date().toISOString(),
    restaurantId: input.restaurantId,
    from: input.from ?? null,
    to: input.to ?? null,
    totalSalesAmount: formatReportingAmount(totalSales),
    totalOrderCount: totalOrders,
    buckets,
  };
}

export async function getSalesChannelAnalytics(
  input: ReportingPeriodInput
): Promise<SalesChannelAnalyticsDto> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }
  const rows = await listServedOrdersForChannelReporting(
    input.restaurantId,
    input.from,
    input.to
  );
  return buildSalesChannelAnalyticsFromOrderLines(input, rows, "en");
}

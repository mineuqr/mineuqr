/**
 * REPORTING-UX-RATIONALIZATION-1 — live DB read-only UAT probe.
 * Prints restaurantId + period KPI totals only (no secrets).
 */
import "dotenv/config";
import { asc } from "drizzle-orm";
import { monthReportingRange, yearReportingRange } from "../../../client/src/lib/reporting-exports/periodRange";
import { buildReportingExportWorkbook } from "../../../client/src/lib/reporting-exports/excel/buildReportingExportWorkbook";
import { buildExecutiveSummaryViewModel } from "../../../client/src/lib/reporting-exports/executiveSummaryPresentation";
import { formatMoneyDisplay } from "../../../client/src/lib/reporting-exports/format";
import { scopedOrderSalesFromRollup } from "../../../client/src/lib/reporting-exports/scopeTotals";
import { restaurants } from "../../../drizzle/schema";
import { getDb } from "../../db";
import {
  getBusinessMetricsSummary,
  getBusinessMetricsTrend,
} from "../BusinessMetricsService";
import { getPaymentMethodAnalytics } from "../PaymentMethodAnalyticsService";
import { getOrderSalesRollup } from "../OrderSalesMetricsService";
import { resolveFinancialReportingSourceMode } from "../financialReportingSource";

async function main() {
  const t0 = Date.now();
  const mode = resolveFinancialReportingSourceMode();
  console.log(JSON.stringify({ sourceMode: mode }));

  const db = await getDb();
  if (!db) {
    console.log(JSON.stringify({ ok: false, reason: "no_db" }));
    process.exit(2);
  }

  const rows = await db
    .select({
      id: restaurants.id,
      nameEn: restaurants.nameEn,
      nameAr: restaurants.nameAr,
    })
    .from(restaurants)
    .orderBy(asc(restaurants.id))
    .limit(5);
  if (rows.length === 0) {
    console.log(JSON.stringify({ ok: false, reason: "no_restaurants" }));
    process.exit(2);
  }

  const restaurant = rows[0]!;
  const restaurantName =
    restaurant.nameEn || restaurant.nameAr || `Restaurant ${restaurant.id}`;
  const month = monthReportingRange(2026, 7);
  const year = yearReportingRange(2026);

  const apiT0 = Date.now();
  const [business, trend, payment, rollup] = await Promise.all([
    getBusinessMetricsSummary({
      restaurantId: restaurant.id,
      from: month.from,
      to: month.to,
    }),
    getBusinessMetricsTrend({
      restaurantId: restaurant.id,
      from: month.from,
      to: month.to,
      grouping: "day",
    }),
    getPaymentMethodAnalytics({
      restaurantId: restaurant.id,
      from: month.from,
      to: month.to,
    }),
    getOrderSalesRollup({
      restaurantId: restaurant.id,
      granularity: "day",
      year: 2026,
      month: 7,
    }),
  ]);
  const apiMs = Date.now() - apiT0;

  const orderPeriod = scopedOrderSalesFromRollup(rollup);
  const formatMoney = (a: string) => formatMoneyDisplay(a, "ر.س");
  const dashVm = buildExecutiveSummaryViewModel({
    language: "en",
    business,
    orderPeriod,
    formatMoney,
  });

  const excelT0 = Date.now();
  const workbook = await buildReportingExportWorkbook(
    {
      restaurantName,
      language: "en",
      scope: "month",
      periodLabel: "July 2026",
      filenameStem: `uat-live-${restaurant.id}-2026-07`,
      business,
      revenueTrend: trend,
      orderSalesRollup: rollup,
      paymentMethodAnalytics: payment,
    },
    "ر.س",
    "SAR"
  );
  const excelMs = Date.now() - excelT0;

  let blob = "";
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        blob += `${cell.value ?? ""}|`;
      });
    });
  }

  const checks: Record<string, boolean> = {};
  for (const card of dashVm.groups[0]!.cards) {
    if (card.kpiId === "orderCount") {
      checks[card.kpiId] = blob.includes(String(orderPeriod.orderCount));
    } else {
      checks[card.kpiId] = blob.includes(card.value);
    }
  }
  checks.totalSalesLabel = blob.includes("Total Sales");
  checks.netSalesLabel = blob.includes("Net Sales");
  checks.refundAmountLabel = blob.includes("Refund Amount");
  checks.noGrossSales = !blob.includes("Gross Sales");
  checks.noCheckRevenue = !blob.includes("Check Revenue");
  checks.paymentSheet = Boolean(workbook.getWorksheet("Payment Analytics"));
  checks.trendsSheet = Boolean(workbook.getWorksheet("Sales Trends"));
  checks.salesOrdersSheet = Boolean(workbook.getWorksheet("Sales Orders"));
  checks.yearBoundsGregorian =
    year.from === "2025-12-31 21:00:00" &&
    year.to === "2026-12-31 20:59:59";
  checks.monthBoundsGregorian = month.from === "2026-06-30 21:00:00";

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        restaurantId: restaurant.id,
        period: { from: month.from, to: month.to },
        kpis: {
          revenue: business.revenue,
          netRevenue: business.netRevenue,
          refundPublishedTotal: business.refundPublishedTotal,
          refundRate: business.refundRate,
          taxCollected: business.taxCollected,
          monetaryTenderTotal: payment.monetaryTenderTotal,
        },
        checks,
        failed,
        perfMs: {
          reportingApis: apiMs,
          excelGeneration: excelMs,
          total: Date.now() - t0,
        },
      },
      null,
      2
    )
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "runtime_error",
      message: err instanceof Error ? err.message : String(err),
    })
  );
  process.exit(1);
});

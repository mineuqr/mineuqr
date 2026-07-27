import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { monthReportingRange } from "../../../client/src/lib/reporting-exports/periodRange";
import {
  getBusinessMetricsSummary,
  getBusinessMetricsTrend,
} from "../BusinessMetricsService";
import { getPaymentMethodAnalytics } from "../PaymentMethodAnalyticsService";
import { getOrderSalesRollup } from "../OrderSalesMetricsService";
import { buildReportingExportWorkbook } from "../../../client/src/lib/reporting-exports/excel/buildReportingExportWorkbook";
import { buildExecutiveSummaryViewModel } from "../../../client/src/lib/reporting-exports/executiveSummaryPresentation";
import { formatMoneyDisplay } from "../../../client/src/lib/reporting-exports/format";
import { scopedOrderSalesFromRollup } from "../../../client/src/lib/reporting-exports/scopeTotals";
import { resolveFinancialReportingSourceMode } from "../financialReportingSource";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("no_db");

  const result = await db.execute(sql`
    SELECT restaurantId AS restaurantId,
           COUNT(*) AS cnt,
           MIN(settledAt) AS minAt,
           MAX(settledAt) AS maxAt
    FROM settlement_records
    GROUP BY restaurantId
    ORDER BY cnt DESC
    LIMIT 5
  `);
  const rows = (result as unknown as { rows?: unknown[] }).rows ??
    (Array.isArray(result) ? result[0] : result);
  console.log("top_restaurants", JSON.stringify(rows));

  const top = Array.isArray(rows) ? rows[0] : null;
  if (!top) {
    console.log(JSON.stringify({ ok: false, reason: "no_settlement_records" }));
    process.exit(2);
  }

  const restaurantId = Number(
    (top as { restaurantId?: number; restaurantid?: number }).restaurantId ??
      (top as { restaurantid?: number }).restaurantid
  );
  const maxAt = String(
    (top as { maxAt?: string; maxat?: string }).maxAt ??
      (top as { maxat?: string }).maxat ??
      ""
  );
  // Derive year/month from max settledAt (stored UTC datetime)
  const instant = new Date(maxAt.includes("T") ? maxAt : maxAt.replace(" ", "T") + "Z");
  const wall = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(instant);
  const year = Number(wall.find((p) => p.type === "year")?.value);
  const monthNum = Number(wall.find((p) => p.type === "month")?.value);
  const range = monthReportingRange(year, monthNum);

  console.log(
    JSON.stringify({
      sourceMode: resolveFinancialReportingSourceMode(),
      restaurantId,
      year,
      month: monthNum,
      range,
    })
  );

  const apiT0 = Date.now();
  const [business, trend, payment, rollup] = await Promise.all([
    getBusinessMetricsSummary({
      restaurantId,
      from: range.from,
      to: range.to,
    }),
    getBusinessMetricsTrend({
      restaurantId,
      from: range.from,
      to: range.to,
      grouping: "day",
    }),
    getPaymentMethodAnalytics({
      restaurantId,
      from: range.from,
      to: range.to,
    }),
    getOrderSalesRollup({
      restaurantId,
      granularity: "day",
      year,
      month: monthNum,
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
      restaurantName: `Restaurant ${restaurantId}`,
      language: "en",
      scope: "month",
      periodLabel: `${year}-${String(monthNum).padStart(2, "0")}`,
      filenameStem: `uat-live-${restaurantId}`,
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

  const failed: string[] = [];
  for (const card of dashVm.groups[0]!.cards) {
    if (card.kpiId === "refundRate") {
      if (!blob.includes(business.refundRate)) failed.push("refundRate");
    } else if (card.kpiId === "orderCount") {
      if (!blob.includes(String(orderPeriod.orderCount))) failed.push("orderCount");
    } else if (!blob.includes(card.value)) {
      failed.push(card.kpiId);
    }
  }
  for (const label of [
    "Total Sales",
    "Net Sales",
    "Refund Amount",
    "Payment Analytics",
    "Sales Trends",
  ]) {
    if (!blob.includes(label)) failed.push(`label:${label}`);
  }
  if (blob.includes("Gross Sales") || blob.includes("Check Revenue")) {
    failed.push("deprecated_financial_label");
  }

  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        failed,
        restaurantId,
        period: range,
        nonZero: Number(business.revenue) > 0,
        kpis: {
          revenue: business.revenue,
          netRevenue: business.netRevenue,
          refundPublishedTotal: business.refundPublishedTotal,
          refundRate: business.refundRate,
          taxCollected: business.taxCollected,
          monetaryTenderTotal: payment.monetaryTenderTotal,
          refundTenderTotal: payment.refundTenderTotal,
          trendPoints: trend.points.length,
        },
        perfMs: { reportingApis: apiMs, excelGeneration: excelMs },
      },
      null,
      2
    )
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});

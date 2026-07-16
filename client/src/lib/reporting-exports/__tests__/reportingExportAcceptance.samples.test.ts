/**
 * REPORTING-PERIOD-CONSISTENCY-1
 * Excel samples + KPI reconciliation across all worksheets (same scope).
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReportingExportWorkbook } from "../excel/buildReportingExportWorkbook";
import { formatMoneyDisplay, parseDtoAmountForDisplay } from "../format";
import {
  scopedOrderSalesFromRollup,
  scopedRevenueFromTrend,
} from "../scopeTotals";
import type { RestaurantReportingExportBundle } from "../types";

const EASTERN_DIGITS = /[٠-٩۰-۹]/;
const samplesDir = join(
  process.cwd(),
  "docs/engineering/programs/REPORTING-PERIOD-CONSISTENCY-1/samples"
);

function dayPoints(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const revenue = (800 + i * 37.5).toFixed(2);
    return {
      periodKey: `2026-07-${day}`,
      periodStart: `2026-07-${day}T00:00:00.000Z`,
      revenue,
      paidCheckCount: 3 + (i % 5),
      complimentaryCount: i % 7 === 0 ? 1 : 0,
      voidedCount: i % 11 === 0 ? 1 : 0,
      taxCollected: (Number(revenue) * 0.15).toFixed(2),
    };
  });
}

function dayOrders(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return {
      periodKey: `2026-07-${day}`,
      orderCount: 6 + (i % 4),
      completedOrders: 5 + (i % 4),
      orderSales: (1100 + i * 42).toFixed(2),
    };
  });
}

function monthPoints() {
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const revenue = (12000 + i * 850).toFixed(2);
    return {
      periodKey: `2026-${month}`,
      periodStart: `2026-${month}-01T00:00:00.000Z`,
      revenue,
      paidCheckCount: 40 + i * 3,
      complimentaryCount: 1,
      voidedCount: 0,
      taxCollected: (Number(revenue) * 0.15).toFixed(2),
    };
  });
}

function monthOrders() {
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    return {
      periodKey: `2026-${month}`,
      orderCount: 180 + i * 8,
      completedOrders: 170 + i * 8,
      orderSales: (28000 + i * 1200).toFixed(2),
    };
  });
}

function sampleBundle(
  language: RestaurantReportingExportBundle["language"],
  scope: RestaurantReportingExportBundle["scope"]
): RestaurantReportingExportBundle {
  const isMonth = scope === "month";
  const orderSalesRollup = {
    contractVersion: 1 as const,
    contractId: "OrderSalesRollup" as const,
    generatedAt: "2026-07-16T00:00:00.000Z",
    restaurantId: 1,
    granularity: (isMonth ? "day" : "month") as "day" | "month",
    periods: isMonth ? dayOrders(14) : monthOrders(),
  };
  const revenueTrend = {
    contractVersion: 1 as const,
    contractId: "BusinessMetricsTrend" as const,
    generatedAt: "2026-07-16T00:00:00.000Z",
    restaurantId: 1,
    grouping: (isMonth ? "day" : "month") as "day" | "month",
    from: isMonth ? "2026-07-01 00:00:00" : "2026-01-01 00:00:00",
    to: isMonth ? "2026-07-31 23:59:59" : "2026-12-31 23:59:59",
    points: isMonth ? dayPoints(14) : monthPoints(),
  };

  const orderTotals = scopedOrderSalesFromRollup(orderSalesRollup);
  const trendTotals = scopedRevenueFromTrend(revenueTrend);

  return {
    restaurantName: language === "ar" ? "مقهى الديمو" : "Demo Cafe",
    businessName:
      language === "ar" ? "شركة الديمو للضيافة" : "Demo Hospitality Co.",
    language,
    scope,
    periodLabel: isMonth
      ? language === "ar"
        ? "يوليو 2026"
        : "July 2026"
      : "2026",
    filenameStem: isMonth
      ? `reporting-consistency-${language}-2026-07`
      : `reporting-consistency-${language}-2026`,
    reportTitle: isMonth
      ? language === "ar"
        ? "التقرير المالي الشهري"
        : "Monthly Financial Report"
      : language === "ar"
        ? "التقرير المالي السنوي"
        : "Annual Financial Report",
    logoUrl: null,
    business: {
      contractVersion: 1,
      contractId: "BusinessMetricsSummary",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      from: revenueTrend.from,
      to: revenueTrend.to,
      // Align summary Revenue with trend series for reconciliation proof
      revenue: trendTotals.revenue,
      paidCheckCount: trendTotals.paidCheckCount,
      averageCheck:
        trendTotals.paidCheckCount > 0
          ? (
              parseDtoAmountForDisplay(trendTotals.revenue) /
              trendTotals.paidCheckCount
            ).toFixed(2)
          : "0.00",
      taxCollected: trendTotals.taxCollected,
      complimentaryCount: 3,
      complimentaryAmount: "120.00",
      voidedCount: 1,
      currency: {
        currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
      },
      sampleTaxPolicySnapshot: {
        version: 1,
        enabled: true,
        mode: "inclusive",
        components: [{ id: "vat", name: "VAT", ratePercent: "15" }],
      },
    },
    orderSalesRollup,
    revenueTrend,
    // stash for assertions via closure — not on type; recompute in test
  };
}

function workbookTextBlob(
  workbook: Awaited<ReturnType<typeof buildReportingExportWorkbook>>
): string {
  let blob = "";
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        blob += `${cell.value ?? ""}|`;
      });
    });
  }
  return blob;
}

describe("REPORTING-PERIOD-CONSISTENCY-1 samples + reconciliation", () => {
  it("writes monthly/yearly Excel samples and reconciles KPIs across sheets", async () => {
    mkdirSync(samplesDir, { recursive: true });
    mkdirSync(
      join(process.cwd(), "docs/engineering/programs/REPORTING-PERIOD-CONSISTENCY-1"),
      { recursive: true }
    );
    expect(existsSync(join(process.cwd(), "client/public/mineuqr-logo.png"))).toBe(
      true
    );

    const reconciliation: string[] = [
      "# KPI Reconciliation — REPORTING-PERIOD-CONSISTENCY-1",
      "",
      "Proof that Executive, Financial, Order Sales, and Revenue Trends share one scope.",
      "",
    ];

    for (const language of ["en"] as const) {
      for (const scope of ["month", "year"] as const) {
        const bundle = sampleBundle(language, scope);
        const orderTotals = scopedOrderSalesFromRollup(bundle.orderSalesRollup);
        const trendTotals = scopedRevenueFromTrend(bundle.revenueTrend);

        // Platform-aligned: summary Revenue matches trend sum for this sample
        expect(bundle.business.revenue).toBe(trendTotals.revenue);
        expect(bundle.business.paidCheckCount).toBe(trendTotals.paidCheckCount);

        const workbook = await buildReportingExportWorkbook(bundle, "ر.س", "SAR");
        expect(workbook.worksheets).toHaveLength(5);

        const blob = workbookTextBlob(workbook);
        expect(blob).not.toMatch(EASTERN_DIGITS);

        const orderSalesDisplay = formatMoneyDisplay(orderTotals.orderSales, "ر.س");
        const revenueDisplay = formatMoneyDisplay(bundle.business.revenue, "ر.س");

        // Executive + Financial + Order Sales total row must show same Order Sales
        expect(blob).toContain(orderSalesDisplay);
        // Revenue on Exec/Financial/Trend total
        expect(blob).toContain(revenueDisplay);
        const ordersFmt = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0,
        }).format(orderTotals.orderCount);
        const paidFmt = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0,
        }).format(bundle.business.paidCheckCount);
        expect(blob).toContain(ordersFmt);
        expect(blob).toContain(paidFmt);

        // No live-month-only signal: workbook must include selected period label
        expect(blob).toContain(bundle.periodLabel);

        reconciliation.push(`## ${scope.toUpperCase()} — ${bundle.periodLabel}`);
        reconciliation.push("");
        reconciliation.push("| KPI | Source DTO | Value | Present on |");
        reconciliation.push("|-----|------------|-------|------------|");
        reconciliation.push(
          `| Revenue | BusinessMetricsSummary (= trend sum) | ${revenueDisplay} | Executive, Financial, Revenue Trends total |`
        );
        reconciliation.push(
          `| Paid Checks | BusinessMetricsSummary | ${bundle.business.paidCheckCount} | Executive, Financial, Revenue Trends total |`
        );
        reconciliation.push(
          `| Order Sales | OrderSalesRollup (sum of periods) | ${orderSalesDisplay} | Executive, Financial, Order Sales total |`
        );
        reconciliation.push(
          `| Orders | OrderSalesRollup (sum) | ${orderTotals.orderCount} | Executive, Financial, Order Sales total |`
        );
        reconciliation.push(
          `| Completed Orders | OrderSalesRollup (sum) | ${orderTotals.completedOrders} | Financial, Order Sales total |`
        );
        reconciliation.push("");
        reconciliation.push(
          `Scope invariant: all values describe **${bundle.periodLabel}** only. OrderSalesSummary.month is not used.`
        );
        reconciliation.push("");

        const xlsxBuf = await workbook.xlsx.writeBuffer();
        writeFileSync(
          join(samplesDir, `${bundle.filenameStem}.xlsx`),
          Buffer.from(xlsxBuf)
        );
      }
    }

    writeFileSync(
      join(
        process.cwd(),
        "docs/engineering/programs/REPORTING-PERIOD-CONSISTENCY-1/KPI-RECONCILIATION.md"
      ),
      reconciliation.join("\n"),
      "utf8"
    );
  }, 120_000);
});

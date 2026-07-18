/**
 * REPORTING-DESIGN-LANGUAGE-1
 * Excel samples + chart embeds + KPI reconciliation across all worksheets (same scope).
 */
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import type { Fill } from "exceljs";
import { describe, expect, it } from "vitest";
import { buildReportingExportWorkbook } from "../excel/buildReportingExportWorkbook";
import { formatMoneyDisplay, parseDtoAmountForDisplay } from "../format";
import {
  scopedOrderSalesFromRollup,
  scopedRevenueFromTrend,
} from "../scopeTotals";
import type { RestaurantReportingExportBundle } from "../types";

const EASTERN_DIGITS = /[٠-٩۰-۹]/;
const LEGACY_NAVY_GOLD = new Set(["FF0B1F33", "FFB8943F"]);

/** Pattern fills expose fgColor; gradient fills use stops — never assume fgColor on Fill. */
function fillArgbColors(fill: Fill | undefined | null): readonly string[] {
  if (!fill) return [];
  if (fill.type === "pattern") {
    const argb = fill.fgColor?.argb;
    return argb ? [argb] : [];
  }
  if (fill.type === "gradient") {
    const out: string[] = [];
    for (const stop of fill.stops) {
      const argb = stop.color?.argb;
      if (argb) out.push(argb);
    }
    return out;
  }
  return [];
}

function isLegacyNavyOrGoldFill(fill: Fill | undefined | null): boolean {
  for (const argb of fillArgbColors(fill)) {
    if (LEGACY_NAVY_GOLD.has(argb)) return true;
  }
  return false;
}
const programDir = join(
  process.cwd(),
  "docs/engineering/programs/REPORTING-DESIGN-LANGUAGE-1"
);
const samplesDir = join(programDir, "samples");
const beforeDir = join(programDir, "before");

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
      ? `reporting-design-language-${language}-2026-07`
      : `reporting-design-language-${language}-2026`,
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
    paymentMethodAnalytics: {
      contractVersion: 1,
      contractId: "PaymentMethodAnalytics",
      programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      from: revenueTrend.from,
      to: revenueTrend.to,
      monetaryTenderTotal: trendTotals.revenue,
      complimentaryAmount: "120.00",
      buckets: [
        {
          paymentMethod: "cash",
          category: "cash",
          tenderAmount: (parseDtoAmountForDisplay(trendTotals.revenue) * 0.4).toFixed(2),
          transactionCount: Math.max(1, Math.floor(trendTotals.paidCheckCount * 0.4)),
          checkCount: Math.max(1, Math.floor(trendTotals.paidCheckCount * 0.4)),
          averageCheck: (
            (parseDtoAmountForDisplay(trendTotals.revenue) * 0.4) /
            Math.max(1, Math.floor(trendTotals.paidCheckCount * 0.4))
          ).toFixed(2),
          mixPercent: "40.00",
        },
        {
          paymentMethod: "mada",
          category: "card",
          tenderAmount: (parseDtoAmountForDisplay(trendTotals.revenue) * 0.6).toFixed(2),
          transactionCount: Math.max(1, Math.ceil(trendTotals.paidCheckCount * 0.6)),
          checkCount: Math.max(1, Math.ceil(trendTotals.paidCheckCount * 0.6)),
          averageCheck: (
            (parseDtoAmountForDisplay(trendTotals.revenue) * 0.6) /
            Math.max(1, Math.ceil(trendTotals.paidCheckCount * 0.6))
          ).toFixed(2),
          mixPercent: "60.00",
        },
      ],
    },
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

function copyBeforeBaselines() {
  // Previous official presentation (UX polish) as before baseline
  const srcCandidates = [
    join(
      process.cwd(),
      "docs/engineering/programs/REPORTING-EXCEL-UX-POLISH-1/screenshots"
    ),
    join(
      process.cwd(),
      "docs/engineering/programs/REPORTING-PERIOD-CONSISTENCY-1/screenshots"
    ),
  ];
  mkdirSync(beforeDir, { recursive: true });
  const names = [
    "month-cover.png",
    "month-executive-summary.png",
    "month-financial-summary.png",
    "month-order-sales.png",
    "month-revenue-trends.png",
    "year-cover.png",
    "year-executive-summary.png",
    "year-financial-summary.png",
    "year-order-sales.png",
    "year-revenue-trends.png",
  ];
  for (const name of names) {
    for (const srcShots of srcCandidates) {
      const from = join(srcShots, name);
      if (existsSync(from)) {
        copyFileSync(from, join(beforeDir, name));
        break;
      }
    }
  }
}

describe("REPORTING-DESIGN-LANGUAGE-1 samples + presentation", () => {
  it("writes design-language Excel samples with charts and reconciles KPIs", async () => {
    mkdirSync(samplesDir, { recursive: true });
    mkdirSync(programDir, { recursive: true });
    copyBeforeBaselines();
    expect(existsSync(join(process.cwd(), "client/public/mineuqr-logo.png"))).toBe(
      true
    );

    const reconciliation: string[] = [
      "# KPI Reconciliation — REPORTING-DESIGN-LANGUAGE-1",
      "",
      "Presentation redesign only. Scope totals unchanged from PERIOD-CONSISTENCY-1.",
      "",
    ];

    const languages: RestaurantReportingExportBundle["language"][] = ["en"];
    for (const language of languages) {
      for (const scope of ["month", "year"] as const) {
        const bundle = sampleBundle(language, scope);
        const orderTotals = scopedOrderSalesFromRollup(bundle.orderSalesRollup);
        const trendTotals = scopedRevenueFromTrend(bundle.revenueTrend);

        expect(bundle.business.revenue).toBe(trendTotals.revenue);
        expect(bundle.business.paidCheckCount).toBe(trendTotals.paidCheckCount);

        const workbook = await buildReportingExportWorkbook(bundle, "ر.س", "SAR");
        expect(workbook.worksheets).toHaveLength(6);
        expect(
          workbook.getWorksheet(
            language === "ar" ? "تحليل طرق الدفع" : "Payment Method Analysis"
          )
        ).toBeTruthy();

        const blob = workbookTextBlob(workbook);
        expect(blob).not.toMatch(EASTERN_DIGITS);

        // Full-width canvas: 14 columns on every sheet
        for (const sheet of workbook.worksheets) {
          expect(sheet.columnCount).toBeGreaterThanOrEqual(14);
        }

        // Charts mandatory when ≥2 trend points
        const orderSheetName =
          language === "ar" ? "مبيعات الطلبات" : "Order Sales";
        const trendSheetName =
          language === "ar"
            ? "اتجاهات إيرادات الشيكات"
            : "Check Revenue Trends";
        const orderSheet = workbook.getWorksheet(orderSheetName);
        const trendSheet = workbook.getWorksheet(trendSheetName);
        expect(orderSheet).toBeTruthy();
        expect(trendSheet).toBeTruthy();
        expect(orderSheet!.getImages().length).toBeGreaterThanOrEqual(1);
        expect(trendSheet!.getImages().length).toBeGreaterThanOrEqual(1);

        // Western digits stored as Excel text
        let sawTextFmt = false;
        for (const sheet of workbook.worksheets) {
          sheet.eachRow({ includeEmpty: false }, (row) => {
            row.eachCell({ includeEmpty: false }, (cell) => {
              if (cell.numFmt === "@" && typeof cell.value === "string") {
                sawTextFmt = true;
              }
            });
          });
        }
        expect(sawTextFmt).toBe(true);

        // Legacy navy/gold fills must not appear in the new design language
        let sawLegacyNavy = false;
        for (const sheet of workbook.worksheets) {
          sheet.eachRow({ includeEmpty: false }, (row) => {
            row.eachCell({ includeEmpty: false }, (cell) => {
              if (isLegacyNavyOrGoldFill(cell.fill)) sawLegacyNavy = true;
            });
          });
        }
        expect(sawLegacyNavy).toBe(false);

        const orderSalesDisplay = formatMoneyDisplay(orderTotals.orderSales, "ر.س");
        const revenueDisplay = formatMoneyDisplay(bundle.business.revenue, "ر.س");

        expect(blob).toContain(orderSalesDisplay);
        expect(blob).toContain(revenueDisplay);
        const ordersFmt = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0,
        }).format(orderTotals.orderCount);
        const paidFmt = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0,
        }).format(bundle.business.paidCheckCount);
        expect(blob).toContain(ordersFmt);
        expect(blob).toContain(paidFmt);
        expect(blob).toContain(bundle.periodLabel);

        reconciliation.push(`## ${scope.toUpperCase()} — ${bundle.periodLabel}`);
        reconciliation.push("");
        reconciliation.push("| KPI | Source DTO | Value | Present on |");
        reconciliation.push("|-----|------------|-------|------------|");
        reconciliation.push(
          `| Check Revenue | BusinessMetricsSummary (= trend sum) | ${revenueDisplay} | Executive (At a Glance), Financial, Check Revenue Trends |`
        );
        reconciliation.push(
          `| Paid Checks | BusinessMetricsSummary | ${bundle.business.paidCheckCount} | Executive (At a Glance), Financial, Check Revenue Trends |`
        );
        reconciliation.push(
          `| Order Sales | OrderSalesRollup (sum of periods) | ${orderSalesDisplay} | Executive (At a Glance), Financial, Order Sales |`
        );
        reconciliation.push(
          `| Orders | OrderSalesRollup (sum) | ${orderTotals.orderCount} | Executive (At a Glance), Financial, Order Sales |`
        );
        reconciliation.push(
          `| Tax / Complimentary / Voided | BusinessMetricsSummary | (analysis) | Financial Summary only — not Executive |`
        );
        reconciliation.push(
          `| Payment Method Mix | PaymentMethodAnalytics (Settlement Transactions) | ${bundle.paymentMethodAnalytics.monetaryTenderTotal} tender total | Payment Method Analysis sheet — not Executive / not Check Revenue |`
        );
        reconciliation.push("");
        reconciliation.push(
          `Scope invariant: all values describe **${bundle.periodLabel}** only. Design language: REPORTING-DESIGN-LANGUAGE-1. Payment analytics: REPORTING-PAYMENT-METHOD-ANALYTICS-1.`
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
      join(programDir, "KPI-RECONCILIATION.md"),
      reconciliation.join("\n"),
      "utf8"
    );
  }, 120_000);
});

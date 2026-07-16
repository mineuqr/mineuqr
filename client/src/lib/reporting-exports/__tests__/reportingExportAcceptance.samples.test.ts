/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2
 * Generates executive Excel/PDF samples and asserts Western digits + sheet set.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReportingExportWorkbook } from "../excel/buildReportingExportWorkbook";
import { buildReportingExportPdfBytes } from "../pdf/buildReportingExportPdf";
import type { RestaurantReportingExportBundle } from "../types";

const EASTERN_DIGITS = /[٠-٩۰-۹]/;
const samplesDir = join(
  process.cwd(),
  "docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2/samples"
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
      ? `reporting-acceptance2-${language}-2026-07`
      : `reporting-acceptance2-${language}-2026`,
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
      from: isMonth ? "2026-07-01 00:00:00" : "2026-01-01 00:00:00",
      to: isMonth ? "2026-07-31 23:59:59" : "2026-12-31 23:59:59",
      revenue: isMonth ? "15450.75" : "186200.00",
      paidCheckCount: isMonth ? 75 : 920,
      averageCheck: isMonth ? "206.01" : "202.39",
      taxCollected: isMonth ? "2015.32" : "24280.00",
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
    orderSales: {
      contractVersion: 1,
      contractId: "OrderSalesSummary",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      today: {
        totalOrders: 12,
        completedOrders: 11,
        orderSales: "890.50",
        averageOrder: "80.95",
      },
      month: {
        totalOrders: isMonth ? 210 : 2400,
        completedOrders: isMonth ? 198 : 2280,
        orderSales: isMonth ? "32100.00" : "390000.00",
        averageOrder: "162.12",
      },
    },
    orderSalesRollup: {
      contractVersion: 1,
      contractId: "OrderSalesRollup",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      granularity: isMonth ? "day" : "month",
      periods: isMonth ? dayOrders(14) : monthOrders(),
    },
    revenueTrend: {
      contractVersion: 1,
      contractId: "BusinessMetricsTrend",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      grouping: isMonth ? "day" : "month",
      from: isMonth ? "2026-07-01 00:00:00" : "2026-01-01 00:00:00",
      to: isMonth ? "2026-07-31 23:59:59" : "2026-12-31 23:59:59",
      points: isMonth ? dayPoints(14) : monthPoints(),
    },
  };
}

function assertNoEasternDigitsInWorkbook(
  workbook: Awaited<ReturnType<typeof buildReportingExportWorkbook>>
) {
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const text = String(cell.value ?? "");
        expect(text, `${sheet.name}:${cell.address}`).not.toMatch(EASTERN_DIGITS);
        if (typeof cell.value === "string" && /\d/.test(cell.value)) {
          expect(cell.numFmt, `${sheet.name}:${cell.address}`).toBe("@");
        }
      });
    });
  }
}

describe("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 samples", () => {
  it("writes executive Excel/PDF samples with Western digits and five sheets", async () => {
    mkdirSync(samplesDir, { recursive: true });
    expect(existsSync(join(process.cwd(), "client/public/mineuqr-logo.png"))).toBe(
      true
    );

    for (const language of ["en", "ar"] as const) {
      for (const scope of ["month", "year"] as const) {
        const bundle = sampleBundle(language, scope);
        const workbook = await buildReportingExportWorkbook(bundle, "ر.س", "SAR");
        assertNoEasternDigitsInWorkbook(workbook);

        const names = workbook.worksheets.map((s) => s.name);
        expect(names).toHaveLength(5);
        expect(names.join(" ")).not.toMatch(/Operational|Catalog|تشغيلي|الكتالوج/);

        // Period must not look like a raw ISO date range on cover
        const cover = workbook.worksheets[0]!;
        let coverBlob = "";
        cover.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            coverBlob += `${cell.value ?? ""} `;
          });
        });
        expect(coverBlob).not.toMatch(/01-07-2026|2026-07-01/);
        if (scope === "year") {
          expect(coverBlob).toContain("2026");
          expect(coverBlob).not.toMatch(/July|يوليو/);
        } else {
          expect(coverBlob).toMatch(/July 2026|يوليو 2026/);
        }

        const xlsxBuf = await workbook.xlsx.writeBuffer();
        writeFileSync(
          join(samplesDir, `${bundle.filenameStem}.xlsx`),
          Buffer.from(xlsxBuf)
        );

        const pdfBytes = await buildReportingExportPdfBytes(bundle, "ر.س", "SAR");
        expect(pdfBytes.byteLength).toBeGreaterThan(1000);
        const pdfText = new TextDecoder("latin1").decode(pdfBytes);
        expect(pdfText.startsWith("%PDF")).toBe(true);
        expect(pdfText).not.toMatch(EASTERN_DIGITS);
        writeFileSync(
          join(samplesDir, `${bundle.filenameStem}.pdf`),
          Buffer.from(pdfBytes)
        );
      }
    }
  }, 120_000);
});

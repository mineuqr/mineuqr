/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1
 * Generates sample workbooks/PDFs and asserts Western digits in cell values.
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
  "docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1/samples"
);

function sampleBundle(
  language: RestaurantReportingExportBundle["language"]
): RestaurantReportingExportBundle {
  return {
    restaurantName: language === "ar" ? "مقهى الديمو" : "Demo Cafe",
    businessName: language === "ar" ? "شركة الديمو للضيافة" : "Demo Hospitality Co.",
    language,
    scope: "month",
    periodLabel: language === "ar" ? "يوليو 2026" : "July 2026",
    filenameStem: `reporting-acceptance-${language}-2026-07`,
    reportTitle:
      language === "ar" ? "تقرير الأداء التجاري" : "Business Performance Report",
    logoUrl: null,
    business: {
      contractVersion: 1,
      contractId: "BusinessMetricsSummary",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
      revenue: "15450.75",
      paidCheckCount: 75,
      averageCheck: "206.01",
      taxCollected: "2015.32",
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
        totalOrders: 210,
        completedOrders: 198,
        orderSales: "32100.00",
        averageOrder: "162.12",
      },
    },
    operational: {
      contractVersion: 1,
      contractId: "OperationalMetricsSnapshot",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      activeSessions: 7,
      occupiedTables: 5,
      pendingOrders: 3,
      kitchenLoad: 9,
      activeOrders: 9,
      preparingOrders: 4,
      readyOrders: 2,
    },
    catalog: {
      contractVersion: 1,
      contractId: "CatalogStatsSummary",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      categoryCount: 8,
      itemCount: 64,
      menuVisits: 1420,
    },
    orderSalesRollup: {
      contractVersion: 1,
      contractId: "OrderSalesRollup",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      granularity: "day",
      periods: [
        {
          periodKey: "2026-07-01",
          orderCount: 8,
          completedOrders: 8,
          orderSales: "1240.00",
        },
        {
          periodKey: "2026-07-02",
          orderCount: 11,
          completedOrders: 10,
          orderSales: "1580.25",
        },
        {
          periodKey: "2026-07-03",
          orderCount: 9,
          completedOrders: 9,
          orderSales: "1310.50",
        },
      ],
    },
    revenueTrend: {
      contractVersion: 1,
      contractId: "BusinessMetricsTrend",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      grouping: "day",
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
      points: [
        {
          periodKey: "2026-07-01",
          periodStart: "2026-07-01T00:00:00.000Z",
          revenue: "980.00",
          paidCheckCount: 5,
          complimentaryCount: 0,
          voidedCount: 0,
          taxCollected: "127.83",
        },
        {
          periodKey: "2026-07-02",
          periodStart: "2026-07-02T00:00:00.000Z",
          revenue: "1210.50",
          paidCheckCount: 6,
          complimentaryCount: 1,
          voidedCount: 0,
          taxCollected: "157.89",
        },
        {
          periodKey: "2026-07-03",
          periodStart: "2026-07-03T00:00:00.000Z",
          revenue: "1105.25",
          paidCheckCount: 4,
          complimentaryCount: 0,
          voidedCount: 1,
          taxCollected: "144.16",
        },
      ],
    },
  };
}

function assertNoEasternDigitsInWorkbook(
  workbook: Awaited<ReturnType<typeof buildReportingExportWorkbook>>
) {
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const raw = cell.value;
        const text =
          typeof raw === "object" && raw !== null && "richText" in (raw as object)
            ? String(raw)
            : String(raw ?? "");
        expect(text, `${sheet.name}:${cell.address}`).not.toMatch(EASTERN_DIGITS);
        // Display values must be Western text (@) — never locale-numeric cells.
        if (typeof raw === "string" && /\d/.test(raw)) {
          expect(cell.numFmt, `${sheet.name}:${cell.address}`).toBe("@");
        }
      });
    });
  }
}

describe("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 samples", () => {
  it("writes Excel/PDF samples and enforces Western digits in workbook cells", async () => {
    mkdirSync(samplesDir, { recursive: true });
    expect(existsSync(join(process.cwd(), "client/public/mineuqr-logo.png"))).toBe(
      true
    );

    for (const language of ["en", "ar"] as const) {
      const bundle = sampleBundle(language);
      const workbook = await buildReportingExportWorkbook(bundle, "ر.س", "SAR");
      assertNoEasternDigitsInWorkbook(workbook);

      const cover = workbook.getWorksheet(
        language === "ar" ? "الغلاف" : "Cover"
      );
      expect(cover).toBeTruthy();
      const xlsxBuf = await workbook.xlsx.writeBuffer();
      const xlsxPath = join(samplesDir, `${bundle.filenameStem}.xlsx`);
      writeFileSync(xlsxPath, Buffer.from(xlsxBuf));

      const pdfBytes = await buildReportingExportPdfBytes(bundle, "ر.س", "SAR");
      expect(pdfBytes.byteLength).toBeGreaterThan(1000);
      const pdfText = new TextDecoder("latin1").decode(pdfBytes);
      expect(pdfText.startsWith("%PDF")).toBe(true);
      expect(pdfText).not.toMatch(EASTERN_DIGITS);
      writeFileSync(join(samplesDir, `${bundle.filenameStem}.pdf`), Buffer.from(pdfBytes));

      // Snapshot key cover values for visual audit HTML
      const metaDump: string[] = [];
      cover!.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber < 8) return;
        const parts: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          parts.push(String(cell.value ?? ""));
        });
        if (parts.length) metaDump.push(parts.join(" | "));
      });
      writeFileSync(
        join(samplesDir, `${bundle.filenameStem}.cover-cells.txt`),
        metaDump.join("\n"),
        "utf8"
      );
    }
  }, 60_000);
});

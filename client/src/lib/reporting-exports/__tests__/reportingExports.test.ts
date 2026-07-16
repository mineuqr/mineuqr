import { describe, expect, it } from "vitest";
import { buildReportingExportWorkbook } from "../excel/buildReportingExportWorkbook";
import { buildReportingExportPdfBytes } from "../pdf/buildReportingExportPdf";
import { monthReportingRange, yearReportingRange } from "../periodRange";
import {
  formatExportDateTime,
  formatMoneyDisplay,
  formatTaxPolicySummary,
  resolveExportCurrency,
  toWesternDigits,
} from "../format";
import { formatTrendAxisLabel } from "../periodPresentation";
import type { RestaurantReportingExportBundle } from "../types";

function sampleBundle(
  overrides?: Partial<RestaurantReportingExportBundle>
): RestaurantReportingExportBundle {
  return {
    restaurantName: "Demo Cafe",
    businessName: "Demo Hospitality Co.",
    language: "en",
    scope: "month",
    periodLabel: "July 2026",
    filenameStem: "reporting-2026-07",
    reportTitle: "Monthly Financial Report",
    business: {
      contractVersion: 1,
      contractId: "BusinessMetricsSummary",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
      revenue: "100.00",
      paidCheckCount: 4,
      averageCheck: "25.00",
      taxCollected: "15.00",
      complimentaryCount: 1,
      complimentaryAmount: "10.00",
      voidedCount: 0,
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
        totalOrders: 2,
        completedOrders: 2,
        orderSales: "40.00",
        averageOrder: "20.00",
      },
      month: {
        totalOrders: 10,
        completedOrders: 9,
        orderSales: "200.00",
        averageOrder: "22.22",
      },
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
          orderCount: 2,
          completedOrders: 2,
          orderSales: "40.00",
        },
        {
          periodKey: "2026-07-02",
          orderCount: 3,
          completedOrders: 3,
          orderSales: "55.00",
        },
        {
          periodKey: "2026-07-03",
          orderCount: 1,
          completedOrders: 1,
          orderSales: "20.00",
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
          revenue: "50.00",
          paidCheckCount: 2,
          complimentaryCount: 0,
          voidedCount: 0,
          taxCollected: "7.50",
        },
        {
          periodKey: "2026-07-02",
          periodStart: "2026-07-02T00:00:00.000Z",
          revenue: "30.00",
          paidCheckCount: 1,
          complimentaryCount: 0,
          voidedCount: 0,
          taxCollected: "4.50",
        },
        {
          periodKey: "2026-07-03",
          periodStart: "2026-07-03T00:00:00.000Z",
          revenue: "20.00",
          paidCheckCount: 1,
          complimentaryCount: 1,
          voidedCount: 0,
          taxCollected: "3.00",
        },
      ],
    },
    ...overrides,
  };
}

describe("REPORTING-EXPORTS-1 helpers", () => {
  it("builds month and year reporting ranges", () => {
    expect(monthReportingRange(2026, 2)).toEqual({
      from: "2026-02-01 00:00:00",
      to: "2026-02-28 23:59:59",
    });
    expect(yearReportingRange(2026).from).toBe("2026-01-01 00:00:00");
  });

  it("resolves currency from Check snapshot in Business Metrics DTO", () => {
    const currency = resolveExportCurrency(sampleBundle().business, "$", "USD");
    expect(currency.currencyCode).toBe("SAR");
    expect(currency.currencySymbol).toBe("ر.س");
  });

  it("renders PDF bytes from Reporting DTO bundle (async)", async () => {
    const bytes = await buildReportingExportPdfBytes(sampleBundle(), "ر.س", "SAR");
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text.startsWith("%PDF")).toBe(true);
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(text).not.toContain("ops.getSettlement");
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
  });

  it("formats tax policy from Check snapshot on the Reporting DTO", () => {
    expect(formatTaxPolicySummary(sampleBundle().business, "en")).toContain("15%");
  });

  it("enforces Western digits for export money/dates regardless of language", () => {
    expect(toWesternDigits("١٥٤٥٠")).toBe("15450");
    expect(toWesternDigits("۱۵٫۵")).toBe("15.5");
    expect(formatMoneyDisplay("١٥٬٤٥٠٫٧٥", "SAR")).toBe("15,450.75 SAR");
    const arDate = formatExportDateTime(new Date("2026-07-16T12:00:00.000Z"), "ar");
    expect(arDate).toMatch(/[0-9]/);
    expect(arDate).not.toMatch(/[٠-٩۰-۹]/);
  });

  it("formats trend axis labels for month and year scopes", () => {
    expect(formatTrendAxisLabel("2026-07-01", "month", "en")).toBe("1 Jul");
    expect(formatTrendAxisLabel("2026-01", "year", "en")).toBe("Jan");
    expect(formatTrendAxisLabel("2026-12", "year", "en")).toBe("Dec");
  });

  it("builds executive workbook with exactly five worksheets", async () => {
    const workbook = await buildReportingExportWorkbook(sampleBundle(), "ر.س", "SAR");
    const names = workbook.worksheets.map((s) => s.name);
    expect(names).toEqual([
      "Cover",
      "Executive Summary",
      "Financial Summary",
      "Order Sales",
      "Revenue Trends",
    ]);
    expect(names).not.toContain("Operational Summary");
    expect(names).not.toContain("Catalog");
  });
});

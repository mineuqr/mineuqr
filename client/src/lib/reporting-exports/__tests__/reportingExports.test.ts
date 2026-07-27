import { describe, expect, it } from "vitest";
import { buildReportingExportWorkbook } from "../excel/buildReportingExportWorkbook";
import { monthReportingRange, yearReportingRange } from "../periodRange";
import {
  formatExportDateTime,
  formatMoneyDisplay,
  formatTaxPolicySummary,
  resolveExportCurrency,
  toWesternDigits,
} from "../format";
import { formatTrendAxisLabel } from "../periodPresentation";
import { scopedOrderSalesFromRollup } from "../scopeTotals";
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
      refundPublishedTotal: "0.00",
      refundPublicationCount: 0,
      netRevenue: "100.00",
      refundRate: "0.00",
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
          refundPublishedTotal: "0.00",
          netRevenue: "50.00",
        },
        {
          periodKey: "2026-07-02",
          periodStart: "2026-07-02T00:00:00.000Z",
          revenue: "30.00",
          paidCheckCount: 1,
          complimentaryCount: 0,
          voidedCount: 0,
          taxCollected: "4.50",
          refundPublishedTotal: "0.00",
          netRevenue: "30.00",
        },
        {
          periodKey: "2026-07-03",
          periodStart: "2026-07-03T00:00:00.000Z",
          revenue: "20.00",
          paidCheckCount: 1,
          complimentaryCount: 1,
          voidedCount: 0,
          taxCollected: "3.00",
          refundPublishedTotal: "0.00",
          netRevenue: "20.00",
        },
      ],
    },
    paymentMethodAnalytics: {
      contractVersion: 1,
      contractId: "PaymentMethodAnalytics",
      programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
      generatedAt: "2026-07-16T00:00:00.000Z",
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
      monetaryTenderTotal: "100.00",
      complimentaryAmount: "10.00",
      refundTenderTotal: "0.00",
      refundBuckets: [],
      buckets: [
        {
          paymentMethod: "cash",
          category: "cash",
          tenderAmount: "40.00",
          transactionCount: 2,
          checkCount: 2,
          averageCheck: "20.00",
          mixPercent: "40.00",
        },
        {
          paymentMethod: "mada",
          category: "card",
          tenderAmount: "60.00",
          transactionCount: 2,
          checkCount: 2,
          averageCheck: "30.00",
          mixPercent: "60.00",
        },
      ],
    },
    ...overrides,
  };
}

describe("REPORTING-EXPORTS helpers", () => {
  it("builds month and year reporting ranges from Gregorian calendar (Rev 2.0)", () => {
    // Wall midnight Asia/Riyadh (UTC+3)
    expect(monthReportingRange(2026, 2)).toEqual({
      from: "2026-01-31 21:00:00",
      to: "2026-02-28 20:59:59",
    });
    expect(yearReportingRange(2026).from).toBe("2025-12-31 21:00:00");
    expect(yearReportingRange(2026).to).toBe("2026-12-31 20:59:59");
  });

  it("resolves currency from Check snapshot in Business Metrics DTO", () => {
    const currency = resolveExportCurrency(sampleBundle().business, "$", "USD");
    expect(currency.currencyCode).toBe("SAR");
    expect(currency.currencySymbol).toBe("ر.س");
  });

  it("formats tax policy from Check snapshot on the Reporting DTO", () => {
    expect(formatTaxPolicySummary(sampleBundle().business, "en")).toContain("15%");
  });

  it("enforces Western digits for export money/dates regardless of language", () => {
    expect(toWesternDigits("١٥٤٥٠")).toBe("15450");
    expect(formatMoneyDisplay("١٥٬٤٥٠٫٧٥", "SAR")).toBe("15,450.75 SAR");
    const arDate = formatExportDateTime(new Date("2026-07-16T12:00:00.000Z"), "ar");
    expect(arDate).not.toMatch(/[٠-٩۰-۹]/);
  });

  it("formats trend axis labels for month and year scopes", () => {
    expect(formatTrendAxisLabel("2026-07-01", "month", "en")).toBe("1 Jul");
    expect(formatTrendAxisLabel("2026-01", "year", "en")).toBe("Jan");
  });

  it("derives scoped Order Sales from rollup — not live UTC month summary", () => {
    const totals = scopedOrderSalesFromRollup(sampleBundle().orderSalesRollup);
    expect(totals.orderSales).toBe("115.00");
    expect(totals.orderCount).toBe(6);
    expect(totals.completedOrders).toBe(6);
    expect(totals.averageOrder).toBe("19.17");
  });

  it("builds executive workbook with six worksheets including Payment Method Analysis", async () => {
    const workbook = await buildReportingExportWorkbook(sampleBundle(), "ر.س", "SAR");
    const names = workbook.worksheets.map((s) => s.name);
    expect(names).toEqual([
      "Cover",
      "Executive Overview",
      "Sales Analytics",
      "Sales Trends",
      "Financial Analytics",
      "Payment Analytics",
    ]);
  });
});

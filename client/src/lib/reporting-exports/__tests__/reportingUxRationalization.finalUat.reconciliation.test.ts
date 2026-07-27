/**
 * REPORTING-UX-RATIONALIZATION-1 — Final UAT / Dashboard↔Excel reconciliation.
 * Presentation parity only — same DTO bundle drives both surfaces.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXECUTIVE_SUMMARY_KPI_IDS,
  preferredKpiLabel,
  SECTION_TERMINOLOGY,
} from "@shared/reporting-platform";
import { formatMoneyDisplay } from "../format";
import { buildReportingExportWorkbook } from "../excel/buildReportingExportWorkbook";
import { buildExecutiveSummaryViewModel } from "../executiveSummaryPresentation";
import { monthReportingRange, yearReportingRange } from "../periodRange";
import {
  scopedOrderSalesFromRollup,
  scopedRevenueFromTrend,
} from "../scopeTotals";
import type { RestaurantReportingExportBundle } from "../types";

const repoRoot = join(__dirname, "../../../../../");

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function sampleBundle(
  scope: "month" | "year"
): RestaurantReportingExportBundle {
  const range =
    scope === "month"
      ? monthReportingRange(2026, 7)
      : yearReportingRange(2026);

  const business = {
    contractVersion: 1 as const,
    contractId: "BusinessMetricsSummary" as const,
    generatedAt: new Date().toISOString(),
    restaurantId: 1,
    from: range.from,
    to: range.to,
    revenue: "12450.00",
    paidCheckCount: 42,
    averageCheck: "296.43",
    taxCollected: "1624.57",
    complimentaryCount: 1,
    complimentaryAmount: "50.00",
    voidedCount: 0,
    refundPublishedTotal: "320.00",
    refundPublicationCount: 2,
    netRevenue: "12130.00",
    refundRate: "2.57",
    currency: {
      currencyCode: "SAR",
      currencySymbol: "ر.س",
      currencyDecimals: 2,
    },
    sampleTaxPolicySnapshot: null,
  };

  const dayCount = scope === "month" ? 31 : 12;
  const points = Array.from({ length: dayCount }, (_, i) => {
    const key =
      scope === "month"
        ? `2026-07-${pad2(i + 1)}`
        : `2026-${pad2(i + 1)}`;
    const slice = (12450 / dayCount).toFixed(2);
    const refundSlice = (320 / dayCount).toFixed(2);
    return {
      periodKey: key,
      periodStart: `${key}T00:00:00.000Z`,
      revenue: slice,
      paidCheckCount: Math.max(1, Math.floor(42 / dayCount)),
      complimentaryCount: 0,
      voidedCount: 0,
      taxCollected: (Number(slice) * 0.15).toFixed(2),
      refundPublishedTotal: refundSlice,
      netRevenue: (Number(slice) - Number(refundSlice)).toFixed(2),
    };
  });

  const trendSum = points.reduce((s, p) => s + Number(p.revenue), 0);
  const drift = Number(business.revenue) - trendSum;
  points[0]!.revenue = (Number(points[0]!.revenue) + drift).toFixed(2);
  points[0]!.netRevenue = (
    Number(points[0]!.revenue) - Number(points[0]!.refundPublishedTotal)
  ).toFixed(2);

  const paidSum = points.reduce((s, p) => s + p.paidCheckCount, 0);
  const paidDrift = business.paidCheckCount - paidSum;
  points[0]!.paidCheckCount += paidDrift;

  const orderPeriods = points.map((p, i) => ({
    periodKey: p.periodKey,
    orderCount: 5 + (i % 3),
    completedOrders: 4 + (i % 3),
    orderSales: (Number(p.revenue) * 1.1).toFixed(2),
  }));

  return {
    language: "en",
    scope,
    restaurantName: "UAT Restaurant",
    periodLabel: scope === "month" ? "July 2026" : "2026",
    filenameStem: scope === "month" ? "uat-2026-07" : "uat-2026",
    business,
    revenueTrend: {
      contractVersion: 1,
      contractId: "BusinessMetricsTrend",
      generatedAt: new Date().toISOString(),
      restaurantId: 1,
      from: business.from,
      to: business.to,
      grouping: scope === "month" ? "day" : "month",
      points,
    },
    orderSalesRollup: {
      contractVersion: 1,
      contractId: "OrderSalesRollup",
      generatedAt: new Date().toISOString(),
      restaurantId: 1,
      granularity: scope === "month" ? "day" : "month",
      periods: orderPeriods,
    },
    paymentMethodAnalytics: {
      contractVersion: 1,
      contractId: "PaymentMethodAnalytics",
      programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
      generatedAt: new Date().toISOString(),
      restaurantId: 1,
      from: business.from,
      to: business.to,
      monetaryTenderTotal: "12450.00",
      complimentaryAmount: "50.00",
      refundTenderTotal: "320.00",
      buckets: [
        {
          paymentMethod: "cash",
          category: "cash",
          tenderAmount: "7450.00",
          transactionCount: 25,
          checkCount: 25,
          averageCheck: "298.00",
          mixPercent: "59.84",
        },
        {
          paymentMethod: "card",
          category: "card",
          tenderAmount: "5000.00",
          transactionCount: 17,
          checkCount: 17,
          averageCheck: "294.12",
          mixPercent: "40.16",
        },
      ],
      refundBuckets: [
        {
          paymentMethod: "cash",
          category: "cash",
          tenderAmount: "200.00",
          transactionCount: 1,
          checkCount: 1,
          averageCheck: "200.00",
          mixPercent: "62.50",
        },
        {
          paymentMethod: "card",
          category: "card",
          tenderAmount: "120.00",
          transactionCount: 1,
          checkCount: 1,
          averageCheck: "120.00",
          mixPercent: "37.50",
        },
      ],
    },
  } as RestaurantReportingExportBundle;
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

describe("REPORTING-UX-RATIONALIZATION-1 Final UAT reconciliation", () => {
  it("period helpers are Gregorian month/year (Asia/Riyadh wall → stored UTC)", () => {
    expect(monthReportingRange(2026, 2)).toEqual({
      from: "2026-01-31 21:00:00",
      to: "2026-02-28 20:59:59",
    });
    expect(yearReportingRange(2026)).toEqual({
      from: "2025-12-31 21:00:00",
      to: "2026-12-31 20:59:59",
    });
  });

  it("Production payment analytics source default is settlement_record", () => {
    const src = readFileSync(
      join(repoRoot, "server/reporting-platform/financialReportingSource.ts"),
      "utf8"
    );
    expect(src).toContain(
      'const DEFAULT_MODE: FinancialReportingSourceMode = "settlement_record"'
    );
    expect(src).toContain("settlement_record (default / cutover)");
  });

  it.each(["month", "year"] as const)(
    "Dashboard Exec V2 values equal Excel blob for same %s DTO bundle",
    async (scope) => {
      const bundle = sampleBundle(scope);
      const orderPeriod = scopedOrderSalesFromRollup(bundle.orderSalesRollup);
      const trendTotals = scopedRevenueFromTrend(bundle.revenueTrend);

      expect(bundle.business.revenue).toBe(trendTotals.revenue);
      expect(bundle.business.paidCheckCount).toBe(trendTotals.paidCheckCount);

      const formatMoney = (amount: string) =>
        formatMoneyDisplay(amount, "ر.س");

      const dashVm = buildExecutiveSummaryViewModel({
        language: "en",
        business: bundle.business,
        orderPeriod,
        formatMoney,
        paymentMonetaryTenderTotal:
          bundle.paymentMethodAnalytics.monetaryTenderTotal,
      });

      expect(dashVm.groups[0]?.cards.map((c) => c.kpiId)).toEqual([
        ...EXECUTIVE_SUMMARY_KPI_IDS,
        "paymentOverview",
      ]);
      expect(dashVm.groups[0]?.cards).toHaveLength(6);      expect(preferredKpiLabel("revenue", "en")).toBe("Total Sales");
      expect(preferredKpiLabel("netRevenue", "en")).toBe("Net Sales");
      expect(preferredKpiLabel("refundPublishedTotal", "en")).toBe(
        "Refund Amount"
      );
      expect(preferredKpiLabel("refundRate", "en")).toBe("Refund Rate");
      expect(preferredKpiLabel("orderSales", "en")).toBe("Sales Orders");
      expect(preferredKpiLabel("revenue", "ar")).toBe("إجمالي المبيعات");
      expect(preferredKpiLabel("orderSales", "ar")).toBe("مبيعات الطلبات");

      const workbook = await buildReportingExportWorkbook(
        bundle,
        "ر.س",
        "SAR"
      );
      const blob = workbookTextBlob(workbook);
      const labels = SECTION_TERMINOLOGY.en;

      expect(workbook.getWorksheet(labels.paymentMethodAnalysis)).toBeTruthy();
      expect(workbook.getWorksheet(labels.checkRevenueTrends)).toBeTruthy();
      expect(workbook.getWorksheet(labels.executiveSummary)).toBeTruthy();
      expect(workbook.getWorksheet(labels.financialSummary)).toBeTruthy();

      // Exact formatted totals (Dashboard formatMoney ≡ Excel display)
      expect(blob).toContain(formatMoney(bundle.business.revenue));
      expect(blob).toContain(formatMoney(bundle.business.netRevenue));
      expect(blob).toContain(formatMoney(bundle.business.refundPublishedTotal));
      expect(blob).toContain(formatMoney(bundle.business.taxCollected));
      expect(blob).toContain(
        formatMoney(bundle.paymentMethodAnalytics.monetaryTenderTotal)
      );
      expect(blob).toContain(
        formatMoney(bundle.paymentMethodAnalytics.refundTenderTotal)
      );

      for (const card of dashVm.groups[0]!.cards) {
        if (card.kpiId === "orderCount") {
          expect(String(card.value)).toBe(String(orderPeriod.orderCount));
          expect(blob).toContain(String(orderPeriod.orderCount));
        } else if (card.kpiId === "paymentOverview") {
          expect(card.value).toBe(
            formatMoney(bundle.paymentMethodAnalytics.monetaryTenderTotal)
          );
          expect(blob).toContain(card.value);
        } else {
          expect(blob).toContain(card.value);
        }
        expect(blob).toContain(card.label);
      }

      expect(blob).toContain("Total Sales");
      expect(blob).toContain("Net Sales");
      expect(blob).toContain("Refund Amount");
      expect(blob).toContain("Refund Rate");
      expect(blob).not.toContain("Gross Sales");
      expect(blob).not.toContain("Check Revenue");
    }
  );
});

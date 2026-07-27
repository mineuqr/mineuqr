/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-2 — drill-down + empty + colors (presentation).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  executiveCardDrillTarget,
  FINANCIAL_SECTION_IDS,
  focusBreadcrumbLabel,
} from "../executiveDrillDown";
import { isExecutivePeriodEmpty } from "../executivePeriodDashboard";
import { REPORTING_CATEGORY_HEX } from "../reportingExecutiveColors";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PRODUCT-UX-RESTRUCTURE-2", () => {
  it("maps every executive card to a Financial Analytics section", () => {
    expect(executiveCardDrillTarget("cashSales").sectionId).toBe(
      FINANCIAL_SECTION_IDS.payment
    );
    expect(executiveCardDrillTarget("cardSales").focus).toBe("payment-card");
    expect(executiveCardDrillTarget("refundPublishedTotal").focus).toBe(
      "refunds"
    );
    expect(executiveCardDrillTarget("taxCollected").sectionId).toBe(
      FINANCIAL_SECTION_IDS.tax
    );
    expect(executiveCardDrillTarget("orderCount").sectionId).toBe(
      FINANCIAL_SECTION_IDS.orders
    );
    expect(executiveCardDrillTarget("netRevenue").focus).toBe("sales-trend");
  });

  it("treats all-zero periods as empty", () => {
    expect(
      isExecutivePeriodEmpty({
        business: {
          revenue: "0.00",
          netRevenue: "0.00",
          refundPublishedTotal: "0.00",
          taxCollected: "0.00",
        } as never,
        payment: { monetaryTenderTotal: "0.00", buckets: [] } as never,
        orderCount: 0,
      })
    ).toBe(true);
    expect(
      isExecutivePeriodEmpty({
        business: { revenue: "10.00" } as never,
        payment: null,
        orderCount: 0,
      })
    ).toBe(false);
  });

  it("exposes category hex tokens for charts", () => {
    expect(REPORTING_CATEGORY_HEX.cash).toMatch(/^#/);
    expect(REPORTING_CATEGORY_HEX.refund).toBe("#fb7185");
    expect(REPORTING_CATEGORY_HEX.net).toBe("#2dd4bf");
  });

  it("wires drill-down and empty states in ReportsTab", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toMatch(/REPORTING-PRODUCT-(UX-RESTRUCTURE-2|POLISH-1)/);
    expect(reports).toContain("drillFromCard");
    expect(reports).toContain("ExecutivePeriodEmptyState");
    expect(reports).toContain("ExecutivePeriodDashboardSkeleton");
    expect(reports).toContain("OrdersDetailsSection");
    expect(reports).toContain("FINANCIAL_SECTION_IDS");
    expect(focusBreadcrumbLabel("refunds", "en")).toMatch(/Refund/i);
  });

  it("charts consume shared category colors", () => {
    const trends = read(
      "client/src/components/dashboard/SettlementTrendsSection.tsx"
    );
    const refunds = read(
      "client/src/components/dashboard/RefundAnalyticsSection.tsx"
    );
    expect(trends).toContain("REPORTING_CATEGORY_HEX");
    expect(refunds).toContain("REPORTING_CATEGORY_HEX.refund");
  });
});

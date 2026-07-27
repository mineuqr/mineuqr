/**
 * REPORTING-UX-SIMPLIFICATION-1 — Sales Orders / Executive Overview presentation guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXECUTIVE_SUMMARY_KPI_IDS,
  SEMANTIC_CLARIFICATIONS,
  SECTION_TERMINOLOGY,
  preferredKpiLabel,
} from "../productSemantics";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-UX-SIMPLIFICATION-1 dashboard presentation guards", () => {
  it("Executive Overview uses decision-flow primary KPI ids", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "revenue",
      "orderCount",
      "orderSales",
      "refundPublishedTotal",
      "taxCollected",
    ]);
    expect(EXECUTIVE_SUMMARY_KPI_IDS).toContain("orderSales");
  });

  it("ReportsTab product UX uses three tabs — Today / Month / Financial", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toMatch(/REPORTING-PRODUCT-(UX-RESTRUCTURE-2|POLISH-1)/);
    expect(reports).toContain('ProductReportTab = "today" | "month" | "financial"');
    expect(reports).toContain("buildExecutivePeriodDashboardVm");
    expect(reports).toContain("ExecutivePeriodDashboardGrid");
    expect(reports).toContain("executiveCardDrillTarget");
    expect(reports).toContain("SalesSourceAnalysisSection");
    expect(reports).toContain("OrdersDetailsSection");
    expect(reports).toContain("financialAnalytics");
    expect(reports).not.toContain("salesAnalytics");
    expect(reports).not.toContain("averageOrder");
    expect(reports).not.toContain("averageCheck");
  });

  it("Executive presentation maps Sales Orders from scoped totals", () => {
    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(presentation).toContain('case "orderSales"');
    expect(presentation).toContain("orderPeriod.orderSales");
    expect(presentation).toContain("Total Sales");
    expect(presentation).toContain("Sales Orders");
    expect(presentation).toContain("paymentOverview");
  });

  it("Product Semantics labels remain unambiguous", () => {
    expect(preferredKpiLabel("completedOrders", "en")).toBe("Completed Orders");
    expect(preferredKpiLabel("orderSales", "en")).toBe("Sales Orders");
    expect(preferredKpiLabel("revenue", "en")).toBe("Total Sales");
    expect(SEMANTIC_CLARIFICATIONS.en.orderSalesPopulation).toMatch(
      /completed \(served\) population/i
    );
    expect(SECTION_TERMINOLOGY.en.salesAnalytics).toBe("Sales Analytics");
    expect(SECTION_TERMINOLOGY.en.financialAnalytics).toBe(
      "Financial Analytics"
    );
  });

  it("does not change Sales Orders / Total Sales formulas", () => {
    expect(getKpiDefinition("orderSales").formula).toContain("completedSales");
    expect(getKpiDefinition("revenue").formula).toContain("grandTotal");
    expect(getKpiDefinition("completedOrders").dtoField).toContain(
      "completedOrders"
    );
  });
});

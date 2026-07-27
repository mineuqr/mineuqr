/**
 * REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1 — architecture guards.
 * Superseded presentation selection by REPORTING-UX-RATIONALIZATION-1 Exec V2;
 * operational Sales Orders cards still bind completedOrders on ReportsTab.
 * REPORTING-BUSINESS-TERMINOLOGY-FINANCIAL-GOVERNANCE-ADOPTION-1 — Sales Orders label.
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

describe("REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1 architecture guards", () => {
  it("Executive Summary Exec V2 includes averageOrder from operational totals", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "revenue",
      "netRevenue",
      "refundPublishedTotal",
      "refundRate",
      "taxCollected",
      "orderCount",
      "averageOrder",
      "averageCheck",
    ]);
    expect(EXECUTIVE_SUMMARY_KPI_IDS).toContain("averageOrder");
  });

  it("ReportsTab Sales Orders cards bind completedOrders DTO fields", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toContain('kpiDisplayName("completedOrders"');
    expect(reports).toContain("orderPeriod.completedOrders");
    expect(reports).toContain("row.completedOrders");
    expect(reports).toContain("orderSalesAnalyticsNote");
    expect(reports).toContain("Sales Orders");
    expect(reports).not.toContain("today.totalOrders");
    expect(reports).not.toContain("month.totalOrders");
  });

  it("Executive presentation maps averageOrder from scoped operational totals", () => {
    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(presentation).toContain('case "averageOrder"');
    expect(presentation).toContain("orderPeriod.averageOrder");
    expect(presentation).toContain("Total Sales");
    expect(presentation).toContain("Sales Orders");
  });

  it("Product Semantics labels remain unambiguous", () => {
    expect(preferredKpiLabel("completedOrders", "en")).toBe("Completed Orders");
    expect(preferredKpiLabel("completedOrders", "ar")).toBe("الطلبات المكتملة");
    expect(preferredKpiLabel("orderCount", "en")).toBe("Orders");
    expect(preferredKpiLabel("orderSales", "en")).toBe("Sales Orders");
    expect(preferredKpiLabel("revenue", "en")).toBe("Total Sales");
    expect(SEMANTIC_CLARIFICATIONS.en.orderSalesPopulation).toMatch(
      /completed \(served\) population/i
    );
    expect(SECTION_TERMINOLOGY.en.orderSalesAnalyticsNote).toMatch(
      /Completed \(served\)/i
    );
    expect(SECTION_TERMINOLOGY.ar.orderSalesAnalyticsNote).toMatch(/المكتملة/);
  });

  it("does not change Sales Orders / Total Sales formulas", () => {
    expect(getKpiDefinition("orderSales").formula).toContain("completedSales");
    expect(getKpiDefinition("revenue").formula).toContain("grandTotal");
    expect(getKpiDefinition("completedOrders").dtoField).toContain(
      "completedOrders"
    );
  });
});

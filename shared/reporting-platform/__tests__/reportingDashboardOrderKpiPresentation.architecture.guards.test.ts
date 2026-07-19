/**
 * REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1 — architecture guards.
 * Presentation only: Order Sales-adjacent counts use completedOrders.
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
  it("Executive Summary uses completedOrders — not orderCount — with Order Sales", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "orderSales",
      "completedOrders",
      "averageOrder",
    ]);
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("orderCount");
  });

  it("ReportsTab Order Sales cards bind completedOrders DTO fields", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toContain("REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1");
    expect(reports).toContain('kpiDisplayName("completedOrders"');
    expect(reports).toContain("today.completedOrders");
    expect(reports).toContain("month.completedOrders");
    expect(reports).toContain("row.completedOrders");
    expect(reports).toContain("orderSalesAnalyticsNote");
    // Must not bind all-created totalOrders on Order Sales KPI cards
    expect(reports).not.toContain("today.totalOrders");
    expect(reports).not.toContain("month.totalOrders");
  });

  it("Executive presentation maps completedOrders value from scoped totals", () => {
    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(presentation).toContain("case \"completedOrders\"");
    expect(presentation).toContain("orderPeriod.completedOrders");
    expect(presentation).not.toMatch(
      /case "orderCount":\s*return formatNullableCount\(orderPeriod\.orderCount\)/
    );
  });

  it("Product Semantics labels remain unambiguous", () => {
    expect(preferredKpiLabel("completedOrders", "en")).toBe("Completed Orders");
    expect(preferredKpiLabel("completedOrders", "ar")).toBe("الطلبات المكتملة");
    expect(preferredKpiLabel("orderCount", "en")).toBe("Orders");
    expect(preferredKpiLabel("orderSales", "en")).toBe("Order Sales");
    expect(SEMANTIC_CLARIFICATIONS.en.orderSalesPopulation).toMatch(
      /completed \(served\) population/i
    );
    expect(SECTION_TERMINOLOGY.en.orderSalesAnalyticsNote).toMatch(
      /Completed \(served\)/i
    );
    expect(SECTION_TERMINOLOGY.ar.orderSalesAnalyticsNote).toMatch(/المكتملة/);
  });

  it("does not change Order Sales / Revenue formulas", () => {
    expect(getKpiDefinition("orderSales").formula).toContain("completedSales");
    expect(getKpiDefinition("revenue").formula).toContain("grandTotal");
    expect(getKpiDefinition("completedOrders").dtoField).toContain(
      "completedOrders"
    );
  });
});

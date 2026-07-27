import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEPRECATED_PRESENTATION_LABELS,
  PREFERRED_KPI_LABELS,
  PRODUCT_SEMANTICS_PROGRAM_ID,
  preferredKpiLabel,
} from "../productSemantics";
import { getKpiDefinition, listAllKpis } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PRODUCT-SEMANTICS-1 architecture guards", () => {
  it("registers preferred labels for every KPI id", () => {
    expect(PRODUCT_SEMANTICS_PROGRAM_ID).toBe(
      "REPORTING-PRODUCT-SEMANTICS-1"
    );
    for (const kpi of listAllKpis()) {
      expect(PREFERRED_KPI_LABELS[kpi.id as keyof typeof PREFERRED_KPI_LABELS]).toBeTruthy();
      expect(preferredKpiLabel(kpi.id as never, "en")).toBe(kpi.name);
    }
  });

  it("Total Sales and Sales Orders stay distinct in dictionary names", () => {
    expect(getKpiDefinition("revenue").name).toBe("Total Sales");
    expect(getKpiDefinition("orderSales").name).toBe("Sales Orders");
    expect(getKpiDefinition("dailySales").name).toBe("Daily Total Sales");
    expect(getKpiDefinition("netRevenue").name).toBe("Net Sales");
    expect(getKpiDefinition("refundPublishedTotal").name).toBe("Refund Amount");
    expect(getKpiDefinition("revenue").formula).toContain("grandTotal");
    expect(getKpiDefinition("revenue").calculationVersion).toBe(1);
  });

  it("presentation helpers consume preferred terminology", () => {
    const display = read("client/src/lib/reporting/kpiDisplay.ts");
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(display).toContain("preferredKpiLabel");
    expect(labels).toContain("preferredKpiLabel");
    expect(labels).toContain("SECTION_TERMINOLOGY");
    expect(labels).toContain("checkRevenueBasis");
    expect(labels).not.toMatch(/revenue:\s*"Revenue"/);
    expect(PREFERRED_KPI_LABELS.revenue.en).toBe("Total Sales");
    expect(PREFERRED_KPI_LABELS.orderSales.en).toBe("Sales Orders");
    expect(PREFERRED_KPI_LABELS.revenue.ar).toBe("إجمالي المبيعات");
    expect(PREFERRED_KPI_LABELS.orderSales.ar).toBe("مبيعات الطلبات");
    expect(PREFERRED_KPI_LABELS.netRevenue.en).toBe("Net Sales");
    expect(PREFERRED_KPI_LABELS.refundPublishedTotal.en).toBe("Refund Amount");
  });

  it("Dashboard sections avoid bare Revenue as section title", () => {
    const overview = read(
      "client/src/components/dashboard/SettlementOverviewSection.tsx"
    );
    const trends = read(
      "client/src/components/dashboard/SettlementTrendsSection.tsx"
    );
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(overview).toContain("SECTION_TERMINOLOGY");
    expect(trends).toContain("SECTION_TERMINOLOGY");
    expect(reports).toContain("Total Sales");
    expect(reports).toContain("Sales Orders");
    expect(reports).toContain("salesAnalytics");
    expect(reports).toContain("financialAnalytics");
    expect(reports).not.toContain("Gross Sales");
    expect(reports).not.toContain("Check Revenue");
    expect(overview).not.toContain('"Revenue Overview"');
    expect(trends).not.toContain('"Revenue Trends"');
  });

  it("documents deprecated ambiguous synonyms", () => {
    expect(DEPRECATED_PRESENTATION_LABELS.forCheckRevenue).toEqual(
      expect.arrayContaining([
        "Revenue",
        "Paid Revenue",
        "Settlement Revenue",
        "Check Revenue",
        "Gross Sales",
        "Check Sales",
        "Session Sales",
      ])
    );
    expect(DEPRECATED_PRESENTATION_LABELS.forOrderSales).toEqual(
      expect.arrayContaining([
        "Gross Sales",
        "Total Sales",
        "Net Sales",
        "Check Revenue",
        "Order Sales",
      ])
    );
  });

  it("Excel reporting basis clarifies Total Sales vs Sales Orders", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toContain("checkRevenueBasis");
    expect(excel).toContain("orderSalesBasis");
  });
});

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

  it("Check Revenue and Order Sales stay distinct in dictionary names", () => {
    expect(getKpiDefinition("revenue").name).toBe("Check Revenue");
    expect(getKpiDefinition("orderSales").name).toBe("Order Sales");
    expect(getKpiDefinition("dailySales").name).toBe("Daily Check Revenue");
    expect(getKpiDefinition("revenue").formula).toContain("grandTotal");
    expect(getKpiDefinition("revenue").calculationVersion).toBe(1);
  });

  it("presentation helpers consume preferred terminology", () => {
    const display = read("client/src/lib/reporting/kpiDisplay.ts");
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(display).toContain("preferredKpiLabel");
    expect(labels).toContain("Check Revenue");
    expect(labels).toContain("إيرادات الشيكات");
    expect(labels).toContain("checkRevenueBasis");
    expect(labels).not.toMatch(/revenue:\s*"Revenue"/);
  });

  it("Dashboard Check Revenue sections avoid bare Revenue as section title", () => {
    const overview = read(
      "client/src/components/dashboard/SettlementOverviewSection.tsx"
    );
    const trends = read(
      "client/src/components/dashboard/SettlementTrendsSection.tsx"
    );
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(overview).toContain("Check Revenue Overview");
    expect(trends).toContain("Check Revenue Trends");
    expect(reports).toContain("Check Revenue Analytics");
    expect(overview).not.toContain('"Revenue Overview"');
    expect(trends).not.toContain('"Revenue Trends"');
  });

  it("documents deprecated ambiguous synonyms", () => {
    expect(DEPRECATED_PRESENTATION_LABELS.forCheckRevenue).toEqual(
      expect.arrayContaining([
        "Revenue",
        "Gross Sales",
        "Paid Revenue",
        "Settlement Revenue",
      ])
    );
    expect(DEPRECATED_PRESENTATION_LABELS.forOrderSales).toEqual(
      expect.arrayContaining(["Check Revenue", "Gross Sales"])
    );
  });

  it("Excel reporting basis clarifies Check Revenue vs Order Sales", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toContain("checkRevenueBasis");
    expect(excel).toContain("orderSalesBasis");
  });
});

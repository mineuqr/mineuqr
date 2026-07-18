import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXECUTIVE_SUMMARY_KPI_IDS } from "@shared/reporting-platform";
import {
  buildExecutiveSummaryCards,
  buildExecutiveSummaryViewModel,
} from "../executiveSummaryPresentation";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const sampleBusiness = {
  revenue: "100.00",
  taxCollected: "15.00",
  paidCheckCount: 4,
  averageCheck: "25.00",
  complimentaryCount: 2,
  complimentaryAmount: "10.00",
  voidedCount: 1,
} as BusinessMetricsSummaryDto;

const sampleOrders = {
  orderSales: "200.00",
  orderCount: 10,
  completedOrders: 8,
  averageOrder: "25.00",
};

describe("REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 + UX-1 guards", () => {
  it("Executive Summary exposes exactly six management KPIs", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "revenue",
      "orderSales",
      "paidCheckCount",
      "orderCount",
      "averageCheck",
      "averageOrder",
    ]);
  });

  it("UX view model groups collected vs served without renaming KPIs", () => {
    const vm = buildExecutiveSummaryViewModel({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(vm.primaryQuestion).toMatch(/perform/i);
    expect(vm.groups).toHaveLength(2);
    expect(vm.groups[0]?.id).toBe("collected");
    expect(vm.groups[1]?.id).toBe("served");
    expect(vm.groups[0]?.cards.map((c) => c.kpiId)).toEqual([
      "revenue",
      "paidCheckCount",
      "averageCheck",
    ]);
    expect(vm.groups[1]?.cards.map((c) => c.kpiId)).toEqual([
      "orderSales",
      "orderCount",
      "averageOrder",
    ]);
    expect(vm.groups[0]?.cards[0]?.label).toBe("Check Revenue");
    expect(vm.groups[0]?.cards[0]?.caption).toMatch(/paid/i);
    expect(vm.comparisonNote).toMatch(/different/i);
  });

  it("flat card builder still omits tax / complimentary / voided", () => {
    const cards = buildExecutiveSummaryCards({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(cards).toHaveLength(6);
    const labels = cards.map((c) => c.label).join(" ");
    expect(labels).not.toMatch(/Tax/i);
    expect(labels).not.toMatch(/Complimentary/i);
    expect(labels).not.toMatch(/Voided/i);
  });

  it("Excel and PDF consume the shared UX view model", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(excel).toContain("buildExecutiveSummaryViewModel");
    expect(pdf).toContain("buildExecutiveSummaryViewModel");
    expect(presentation).toContain("REPORTING-EXECUTIVE-SUMMARY-UX-1");
    expect(presentation).toContain("preferredKpiLabel");
    expect(presentation).not.toContain('label: "Revenue"');
  });

  it("export labels still pull KPI names from Product Semantics", () => {
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(labels).toContain("preferredKpiLabel");
    expect(labels).toContain("SECTION_TERMINOLOGY");
    expect(labels).not.toMatch(/revenue:\s*"Revenue"/);
  });

  it("Financial Summary retains tax and adjustments analysis", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toContain("taxAnalysisSection");
    expect(excel).toContain("adjustmentsSection");
    expect(excel).toContain("labels.taxCollected");
  });
});

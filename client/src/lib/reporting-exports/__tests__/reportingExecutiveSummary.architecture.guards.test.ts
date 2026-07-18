import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXECUTIVE_SUMMARY_KPI_IDS,
  SECTION_TERMINOLOGY,
} from "@shared/reporting-platform";
import {
  buildExecutiveSummaryCards,
  buildExecutiveSummaryViewModel,
} from "../executiveSummaryPresentation";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";

/** Forbids period-specific assumptions in Executive / Tax helper copy. */
const PERIOD_SPECIFIC_COPY =
  /\b(daily|weekly|monthly|quarterly|annual|yearly|month|week|quarter|year)\b/i;

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

describe("REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 guards", () => {
  it("Executive Summary exposes exactly three operational KPIs", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "orderSales",
      "orderCount",
      "averageOrder",
    ]);
  });

  it("view model is operational-only — no Money Collected group", () => {
    const vm = buildExecutiveSummaryViewModel({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(vm.primaryQuestion).toMatch(/operational/i);
    expect(vm.groups).toHaveLength(1);
    expect(vm.groups[0]?.id).toBe("operational");
    expect(vm.groups[0]?.cards.map((c) => c.kpiId)).toEqual([
      "orderSales",
      "orderCount",
      "averageOrder",
    ]);
    expect(vm.groups[0]?.cards[0]?.label).toBe("Order Sales");
    expect(vm.footerNote).toMatch(/Financial Summary/i);
    const allLabels = vm.groups
      .flatMap((g) => g.cards)
      .map((c) => c.label)
      .join(" ");
    expect(allLabels).not.toMatch(/Check Revenue/i);
    expect(allLabels).not.toMatch(/Paid Checks/i);
    expect(allLabels).not.toMatch(/Average Check/i);
    expect(allLabels).not.toMatch(/Tax/i);
  });

  it("flat card builder returns three operational cards only", () => {
    const cards = buildExecutiveSummaryCards({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.kpiId)).toEqual([
      "orderSales",
      "orderCount",
      "averageOrder",
    ]);
  });

  it("Excel and PDF consume the shared view model with footerNote", () => {
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
    expect(excel).toContain("footerNote");
    expect(excel).toContain("moneyCollectedSection");
    expect(excel).toContain("taxAnalysisPeriodNote");
    expect(pdf).toContain("buildExecutiveSummaryViewModel");
    expect(pdf).toContain("footerNote");
    expect(pdf).toContain("moneyCollectedSection");
    expect(pdf).toContain("taxAnalysisPeriodNote");
    expect(presentation).toContain(
      "REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1"
    );
    expect(presentation).toContain("preferredKpiLabel");
    expect(presentation).not.toContain("Money collected");
  });

  it("export labels still pull KPI names from Product Semantics", () => {
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(labels).toContain("preferredKpiLabel");
    expect(labels).toContain("SECTION_TERMINOLOGY");
    expect(labels).toContain("moneyCollected");
    expect(labels).toContain("taxAnalysisPeriodNote");
    expect(labels).not.toMatch(/revenue:\s*"Revenue"/);
  });

  it("Financial Summary retains Money Collected KPIs and tax period clarity", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toContain("labels.revenue");
    expect(excel).toContain("labels.paidChecks");
    expect(excel).toContain("labels.averageCheck");
    expect(excel).toContain("labels.taxCollected");
    expect(excel).toContain("taxAnalysisPeriodNote");
    expect(excel).toContain("moneyCollectedSection");
  });

  it("Executive + Tax presentation copy is period-agnostic (no month/year/… assumptions)", () => {
    for (const lang of ["en", "ar"] as const) {
      const section = SECTION_TERMINOLOGY[lang];
      expect(section.taxAnalysisPeriodNote).not.toMatch(PERIOD_SPECIFIC_COPY);
      expect(section.taxAnalysisPeriodNote).toMatch(/reporting period|فترة التقرير/i);
      expect(section.moneyCollectedHint).not.toMatch(PERIOD_SPECIFIC_COPY);
      expect(section.executiveSnapshotHint).not.toMatch(PERIOD_SPECIFIC_COPY);
    }

    const vm = buildExecutiveSummaryViewModel({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(vm.primaryQuestion).not.toMatch(PERIOD_SPECIFIC_COPY);
    expect(vm.footerNote).not.toMatch(PERIOD_SPECIFIC_COPY);
    expect(vm.groups[0]?.hint).not.toMatch(PERIOD_SPECIFIC_COPY);

    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(presentation).not.toMatch(/bundle\.scope|scope\s*===/);
    expect(presentation).not.toMatch(PERIOD_SPECIFIC_COPY);

    // Executive / Financial tax note must not branch on report scope
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const excelExecutive = excel.slice(
      excel.indexOf("function buildExecutiveSheet"),
      excel.indexOf("function buildFinancialSheet")
    );
    const excelFinancial = excel.slice(
      excel.indexOf("function buildFinancialSheet"),
      excel.indexOf("function buildPaymentMethodSheet")
    );
    expect(excelExecutive).not.toMatch(/scope\s*===/);
    expect(excelFinancial).not.toMatch(/scope\s*===/);
    expect(excelFinancial).toContain("labels.taxAnalysisPeriodNote");
  });
});

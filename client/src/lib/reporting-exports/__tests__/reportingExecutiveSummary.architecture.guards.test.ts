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
  refundPublishedTotal: "10.00",
  refundPublicationCount: 1,
  netRevenue: "90.00",
  refundRate: "10.00",
} as BusinessMetricsSummaryDto;

const sampleOrders = {
  orderSales: "200.00",
  orderCount: 10,
  completedOrders: 8,
  averageOrder: "25.00",
};

describe("REPORTING-UX-RATIONALIZATION-1 Executive Summary V2 guards", () => {
  it("Executive Summary exposes Exec V2 KPI set", () => {
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
  });

  it("view model is executive money + averages", () => {
    const vm = buildExecutiveSummaryViewModel({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(vm.primaryQuestion).toMatch(/performing/i);
    expect(vm.groups).toHaveLength(1);
    expect(vm.groups[0]?.id).toBe("executive");
    expect(vm.groups[0]?.cards.map((c) => c.kpiId)).toEqual([
      ...EXECUTIVE_SUMMARY_KPI_IDS,
    ]);
    expect(vm.groups[0]?.cards[0]?.label).toBe("Gross Sales");
    expect(vm.groups[0]?.cards[1]?.label).toBe("Net Sales");
    expect(vm.groups[0]?.cards[2]?.label).toBe("Refund Amount");
    expect(vm.groups[0]?.cards[2]?.value).toBe("10.00");
    expect(vm.groups[0]?.cards[3]?.value).toBe("10.00%");
  });

  it("flat card builder returns Exec V2 cards", () => {
    const cards = buildExecutiveSummaryCards({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
    });
    expect(cards).toHaveLength(8);
    expect(cards.map((c) => c.kpiId)).toEqual([...EXECUTIVE_SUMMARY_KPI_IDS]);
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
    expect(presentation).toContain("REPORTING-UX-RATIONALIZATION-1");
    expect(presentation).toContain("preferredKpiLabel");
  });

  it("export labels still pull KPI names from Product Semantics", () => {
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(labels).toContain("preferredKpiLabel");
    expect(labels).toContain("SECTION_TERMINOLOGY");
  });

  it("section terminology exposes executive snapshot", () => {
    expect(SECTION_TERMINOLOGY.en.executiveSnapshot).toBe("Executive KPIs");
    expect(SECTION_TERMINOLOGY.en.taxAnalysis).toBe("Tax");
    expect(SECTION_TERMINOLOGY.en.taxAnalysisPeriodNote).not.toMatch(
      PERIOD_SPECIFIC_COPY
    );
  });
});

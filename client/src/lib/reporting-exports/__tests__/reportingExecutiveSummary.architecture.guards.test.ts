import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXECUTIVE_SUMMARY_KPI_IDS } from "@shared/reporting-platform";
import { buildExecutiveSummaryCards } from "../executiveSummaryPresentation";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 guards", () => {
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

  it("shared presentation builder omits tax / complimentary / voided", () => {
    const business = {
      revenue: "100.00",
      taxCollected: "15.00",
      paidCheckCount: 4,
      averageCheck: "25.00",
      complimentaryCount: 2,
      complimentaryAmount: "10.00",
      voidedCount: 1,
    } as BusinessMetricsSummaryDto;
    const cards = buildExecutiveSummaryCards({
      language: "en",
      business,
      orderPeriod: {
        orderSales: "200.00",
        orderCount: 10,
        completedOrders: 8,
        averageOrder: "25.00",
      },
      formatMoney: (a) => a,
    });
    expect(cards).toHaveLength(6);
    const labels = cards.map((c) => c.label).join(" ");
    expect(labels).not.toMatch(/Tax/i);
    expect(labels).not.toMatch(/Complimentary/i);
    expect(labels).not.toMatch(/Voided/i);
    expect(labels).toContain("Check Revenue");
    expect(labels).toContain("Order Sales");
  });

  it("Excel and PDF consume the shared executive builder", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    expect(excel).toContain("buildExecutiveSummaryCards");
    expect(excel).toContain("executiveSnapshotSection");
    expect(excel).toContain("REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1");
    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(presentation).toContain("intentionally omitted");
    expect(presentation).not.toContain("taxCollected");
    expect(pdf).toContain("buildExecutiveSummaryCards");
    expect(pdf).toContain("executiveSnapshotHint");
  });

  it("export labels pull KPI names from Product Semantics", () => {
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(labels).toContain("preferredKpiLabel");
    expect(labels).toContain("SECTION_TERMINOLOGY");
    expect(labels).not.toMatch(/revenue:\s*"Revenue"/);
    expect(labels).not.toMatch(/revenue:\s*"Check Revenue"/);
  });

  it("Financial Summary retains tax and adjustments analysis", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toContain("taxAnalysisSection");
    expect(excel).toContain("adjustmentsSection");
    expect(excel).toContain("labels.taxCollected");
    expect(excel).toContain("labels.complimentaryCount");
    expect(excel).toContain("labels.voidedCount");
  });
});

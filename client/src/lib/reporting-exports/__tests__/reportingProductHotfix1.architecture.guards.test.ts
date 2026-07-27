/**
 * REPORTING-PRODUCT-HOTFIX-1 — hotfix guards (presentation).
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 superseded the null-facts lock.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSalesSourceAnalysisVm } from "../salesSourceAnalysisPresentation";
import { FINANCIAL_SECTION_IDS } from "../executiveDrillDown";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PRODUCT-HOTFIX-1", () => {
  it("Excel export lives in sticky Reporting header toolbar", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toContain("REPORTING-PRODUCT-HOTFIX-1");
    expect(reports).toContain("ReportingExcelToolbar");
    expect(reports).toContain("sticky top-0");
    expect(reports).toContain("FINANCIAL_SECTION_IDS.exports");
    expect(FINANCIAL_SECTION_IDS.exports).toBe("reporting-excel-toolbar");
    // Bottom Financial exports section relocated
    expect(reports).not.toMatch(
      /productTab === "financial"[\s\S]*reportingExportsNote/
    );
  });

  it("Sales Source does not invent facts when projection missing", () => {
    const unavailable = buildSalesSourceAnalysisVm({
      language: "en",
      facts: null,
    });
    expect(unavailable.projectionUnavailable).toBe(true);
    expect(unavailable.hasAnyFact).toBe(false);
    expect(unavailable.cards).toHaveLength(0);

    const emptyPeriod = buildSalesSourceAnalysisVm({
      language: "en",
      facts: [],
    });
    expect(emptyPeriod.projectionUnavailable).toBe(false);
    expect(emptyPeriod.hasAnyFact).toBe(false);

    const withFacts = buildSalesSourceAnalysisVm({
      language: "en",
      facts: [{ channelId: "table", amountDisplay: "120.00", countDisplay: "3" }],
    });
    expect(withFacts.hasAnyFact).toBe(true);
    expect(withFacts.cards.find((c) => c.channelId === "table")?.amountDisplay).toBe(
      "120.00"
    );
    expect(withFacts.cards.find((c) => c.channelId === "qr")?.hasFact).toBe(false);
  });

  it("ReportsTab binds Sales Channel Analytics API (no mock facts)", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toContain("SalesSourceAnalysisSection");
    expect(reports).not.toContain("facts={null}");
    expect(reports).not.toContain('amountDisplay: "0.00"');
    const section = read(
      "client/src/components/dashboard/SalesSourceAnalysisSection.tsx"
    );
    expect(section).toContain("reporting.getSalesChannelAnalytics");
  });

  it("reporting contracts publish SalesChannelAnalytics DTO", () => {
    const contracts = read("shared/reporting-platform/reportingContracts.ts");
    expect(contracts).toContain("SalesChannelAnalyticsDto");
    expect(contracts).toContain('contractId: "SalesChannelAnalytics"');
  });
});

/**
 * REPORTING-PRODUCT-POLISH-1 — presentation finish guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PRODUCT-POLISH-1", () => {
  it("ReportsTab uses shared period toolbar and polish program id", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toMatch(/REPORTING-PRODUCT-(POLISH-1|HOTFIX-1)/);
    expect(reports).toContain("ReportingPeriodToolbar");
    expect(reports).toContain("ReportingExcelToolbar");
    expect(reports).not.toContain("Restaurant Reports");
    expect(reports).not.toContain("Excel or PDF");
  });

  it("export microcopy is Excel-only", () => {
    expect(SECTION_TERMINOLOGY.en.reportingExportsNote).toMatch(/Excel/i);
    expect(SECTION_TERMINOLOGY.en.reportingExportsNote).not.toMatch(/PDF/i);
    expect(SECTION_TERMINOLOGY.ar.reportingExportsNote).not.toMatch(/PDF/i);
  });

  it("empty and error shells share premium treatment", () => {
    const states = read(
      "client/src/components/dashboard/RestaurantSectionStates.tsx"
    );
    expect(states).toContain("REPORTING-PRODUCT-POLISH-1");
    expect(states).toContain("rounded-2xl");
    expect(states).toContain("aria-live");
  });

  it("charts avoid harsh full grids and keep category colors", () => {
    const trends = read(
      "client/src/components/dashboard/SettlementTrendsSection.tsx"
    );
    expect(trends).toContain("vertical={false}");
    expect(trends).toContain("REPORTING_CATEGORY_HEX");
    expect(trends).toContain("isAnimationActive");
  });
});

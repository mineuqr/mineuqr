/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-1 — Product UX presentation guards.
 * No formula / API / schema / constitution mutations in this program.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXECUTIVE_SUMMARY_KPI_IDS } from "@shared/reporting-platform";
import { buildExecutivePeriodDashboardVm } from "../executivePeriodDashboard";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PRODUCT-UX-RESTRUCTURE-1 architecture guards", () => {
  it("ReportsTab ships exactly three product tabs", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toMatch(/REPORTING-PRODUCT-(UX-RESTRUCTURE-2|POLISH-1)/);
    expect(reports).toContain('"today" | "month" | "financial"');
    expect(reports).toContain("ExecutivePeriodDashboardGrid");
    expect(reports).toContain("executiveCardDrillTarget");
    expect(reports).toContain("ExecutivePeriodEmptyState");
    expect(reports).toContain("SettlementTrendsSection");
    expect(reports).toContain("PaymentMethodAnalysisSection");
    expect(reports).toContain("SalesSourceAnalysisSection");
    expect(reports).toContain("RefundAnalyticsSection");
    expect(reports).toContain("taxAnalysis");
  });

  it("Today/Month VM is presentation-only over existing DTO fields", () => {
    const vmSrc = read(
      "client/src/lib/reporting-exports/executivePeriodDashboard.ts"
    );
    expect(vmSrc).toContain("PaymentMethodAnalyticsDto");
    expect(vmSrc).toContain("BusinessMetricsSummaryDto");
    expect(vmSrc).toContain("toCanonicalPaymentMethod");
    expect(vmSrc).toContain("netRevenue");
    expect(vmSrc).not.toContain("grandTotal");
    expect(vmSrc).not.toMatch(/\.reduce\s*\(/);
  });

  it("export Executive Summary allowlist remains unchanged by product tabs", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "revenue",
      "orderCount",
      "orderSales",
      "refundPublishedTotal",
      "taxCollected",
    ]);
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("netRevenue");
  });

  it("Sales Source shell does not invent channel totals", () => {
    const src = read(
      "client/src/components/dashboard/SalesSourceAnalysisSection.tsx"
    );
    expect(src).toMatch(/REPORTING-PRODUCT-UX-RESTRUCTURE-[12]|REPORTING-PRODUCT-POLISH-1/);
    expect(src).toContain("—");
    expect(src).not.toContain("grandTotal");
    expect(src).not.toMatch(/tenderAmount/);
  });

  it("interactive cards are presentation motion only", () => {
    const cards = read(
      "client/src/components/dashboard/ExecutivePeriodDashboard.tsx"
    );
    expect(cards).toContain("hover:scale-");
    expect(cards).toContain("hover:shadow-");
    expect(cards).not.toContain("animate-pulse");
    expect(cards).not.toContain("@keyframes");
  });

  it("product dashboard builder stays available for Today/Month", () => {
    const vm = buildExecutivePeriodDashboardVm({
      scope: "today",
      language: "en",
      business: null,
      payment: null,
      orderCount: null,
      formatMoney: (a) => a,
    });
    expect(vm.cards).toHaveLength(6);
  });
});

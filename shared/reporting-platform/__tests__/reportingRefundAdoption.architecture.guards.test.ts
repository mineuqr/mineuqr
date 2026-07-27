import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getKpiDefinition } from "../kpiDictionary";
import { EXECUTIVE_SUMMARY_KPI_IDS } from "../productSemantics";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-REPORTING-ADOPTION-1 architecture guards", () => {
  it("Gross Revenue formula excludes refund publications", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.formula).toContain("recordGeneration = 1");
    expect(revenue.formula.toLowerCase()).toContain("refund");
    expect(revenue.notDefinedAs).toContain("Sales Orders");
    expect(revenue.name).toBe("Total Sales");
  });

  it("Net Revenue is publication-derived and Reporting-owned derivation only", () => {
    const net = getKpiDefinition("netRevenue");
    expect(net.formula).toContain("revenue");
    expect(net.formula).toContain("refundPublishedTotal");
    expect(net.ownerDomain).toBe("reporting_platform");
    expect(net.dependsOn).toEqual(["revenue", "refundPublishedTotal"]);
  });

  it("Business Metrics loads refund publications separately from Gross", () => {
    const biz = read("server/reporting-platform/BusinessMetricsService.ts");
    const adapter = read(
      "server/reporting-platform/settlementRecordReportingAdapter.ts"
    );
    expect(biz).toContain("listRefundSettlementRecordsForReporting");
    expect(biz).toContain("applyRefundPublicationsToBusinessMetrics");
    expect(adapter).toContain("listRefundSettlementRecordsForReporting");
    expect(adapter).toContain('kind !== "refund"');
    expect(adapter).toContain("Compensating refund generations MUST NOT enter");
    expect(adapter).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
  });

  it("Executive Summary keeps Net Sales off Overview; refund glance allowed", () => {
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("netRevenue");
    expect(EXECUTIVE_SUMMARY_KPI_IDS).toContain("revenue");
    expect(EXECUTIVE_SUMMARY_KPI_IDS).toContain("refundPublishedTotal");
  });

  it("Payment analytics keeps refund buckets additive", () => {
    const pay = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(pay).toContain("listRefundSettlementRecordPaymentLinesForReporting");
    expect(pay).toContain("refundBuckets");
    expect(pay).toContain("refundTenderTotal");
    expect(pay).toContain('"refunded"');
  });
});

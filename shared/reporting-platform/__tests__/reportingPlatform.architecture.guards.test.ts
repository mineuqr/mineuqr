import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KPI_DICTIONARY,
  REPORTING_PLATFORM_ID,
  getKpiDefinition,
} from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PLATFORM-ARCHITECTURE-1 architecture guards", () => {
  it("registers Revenue as Check-owned Paid Check grand totals", () => {
    const revenue = getKpiDefinition("revenue");
    expect(REPORTING_PLATFORM_ID).toBe("REPORTING-PLATFORM-ARCHITECTURE-1");
    expect(revenue.ownerDomain).toBe("check");
    expect(revenue.definition.toLowerCase()).toContain("paid check");
    expect(revenue.notDefinedAs).toEqual(
      expect.arrayContaining([
        "Served order totals",
        "Closed session totals",
        "Order Domain totalAmount",
      ])
    );
  });

  it("separates Order Sales from Revenue ownership", () => {
    expect(KPI_DICTIONARY.orderSales.ownerDomain).toBe("order_read");
    expect(KPI_DICTIONARY.orderSales.notDefinedAs).toEqual(
      expect.arrayContaining(["Revenue"])
    );
    expect(KPI_DICTIONARY.averageCheck.ownerDomain).toBe("check");
    expect(KPI_DICTIONARY.averageOrder.ownerDomain).toBe("order_read");
  });

  it("requires Tax Collected from Check snapshots not live Business Settings", () => {
    const tax = getKpiDefinition("taxCollected");
    expect(tax.ownerDomain).toBe("check");
    expect(tax.sourceOfTruth.toLowerCase()).toContain("snapshot");
    expect(tax.notDefinedAs?.join(" ")).toMatch(/taxEnabled|taxMode|taxPolicyJson/);
  });

  it("Reporting Platform services do not mutate Order / Session / Check write paths", () => {
    const biz = read("server/reporting-platform/BusinessMetricsService.ts");
    const checkRepo = read(
      "server/reporting-platform/checkReportingRepository.ts"
    );
    expect(checkRepo).toContain("read-only");
    expect(biz).not.toContain("settleCheckPaid");
    expect(biz).not.toContain("createOpenCheckForSession");
    expect(biz).not.toContain("placeOrder");
    expect(read("server/reporting-platform/reportingRouter.ts")).toContain(
      "reportingRouter"
    );
  });

  it("Revenue aggregation uses Check grandTotal not session totalAmount", () => {
    const agg = read("server/reporting-platform/businessMetricsAggregator.ts");
    expect(agg).toContain("grandTotal");
    expect(agg).toContain('outcome === "paid"');
    expect(agg).not.toContain("dining_sessions");
    expect(agg).not.toContain("settlementOutcome");
  });

  it("exposes reporting router on AppRouter without redesigning ops settlement", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("reporting: reportingRouter");
    expect(routers).toContain("ops: opsRouter");
  });

  it("shared package has no presentation / Dashboard imports", () => {
    const index = read("shared/reporting-platform/index.ts");
    expect(index).toContain("KPI_DICTIONARY");
    expect(index).toContain("BusinessMetricsSummaryDto");
    expect(index).not.toMatch(/Dashboard|react|trpc/);
  });
});

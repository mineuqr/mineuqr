import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listTsFiles(dirRel: string): string[] {
  const abs = join(repoRoot, dirRel);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const rel = `${dirRel}/${name}`.replace(/\\/g, "/");
    const full = join(repoRoot, rel);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      out.push(...listTsFiles(rel));
      continue;
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

const DASHBOARD_KPI_SURFACES = [
  "client/src/pages/Dashboard.tsx",
  "client/src/components/dashboard/ReportsTab.tsx",
  "client/src/components/dashboard/SettlementOverviewSection.tsx",
  "client/src/components/dashboard/SettlementTrendsSection.tsx",
  "client/src/components/dashboard/OperationalSnapshotSection.tsx",
  "client/src/components/dashboard/SessionsWorkspacePanel.tsx",
  "client/src/lib/settlementOverviewDisplay.ts",
  "client/src/lib/settlementTrendDisplay.ts",
] as const;

describe("REPORTING-DASHBOARD-ADOPTION-1 architecture guards", () => {
  it("Dashboard KPI surfaces consume reporting.* and forbid ops.getSettlement*", () => {
    for (const file of DASHBOARD_KPI_SURFACES) {
      const src = read(file);
      expect(src, file).not.toMatch(/ops\.getSettlement/);
      expect(src, file).not.toContain("getSettlementSummary");
      expect(src, file).not.toContain("getSettlementTrend");
      expect(src, file).not.toContain("getSettlementBreakdown");
      expect(src, file).not.toContain("buildOrderStatistics");
      expect(src, file).not.toContain("buildMonthlyReport");
      expect(src, file).not.toContain("buildYearlySummary");
      expect(src, file).not.toContain("computeTodayCompletedSales");
    }

    expect(read("client/src/components/dashboard/SettlementOverviewSection.tsx")).toContain(
      "reporting.getBusinessMetricsSummary"
    );
    expect(read("client/src/components/dashboard/SettlementTrendsSection.tsx")).toContain(
      "reporting.getBusinessMetricsTrend"
    );
    expect(read("client/src/components/dashboard/OperationalSnapshotSection.tsx")).toContain(
      "reporting.getOperationalMetricsSnapshot"
    );
    expect(read("client/src/components/dashboard/ReportsTab.tsx")).toContain(
      "reporting.getOrderSalesRollup"
    );
    expect(read("client/src/components/dashboard/ReportsTab.tsx")).toContain(
      "reporting.getCatalogStatsSummary"
    );
    expect(read("client/src/components/dashboard/SessionsWorkspacePanel.tsx")).toContain(
      "reporting.getBusinessMetricsSummary"
    );
  });

  it("does not resurrect client KPI builders under dashboard components", () => {
    for (const file of listTsFiles("client/src/components/dashboard")) {
      const src = read(file);
      expect(src, file).not.toContain("buildOrderStatistics");
      expect(src, file).not.toMatch(/ops\.getSettlement/);
      expect(src, file).not.toContain("computeTodayCompletedSales");
    }
  });

  it("presentation helpers format Reporting DTOs without inventing Revenue", () => {
    const overview = read("client/src/lib/settlementOverviewDisplay.ts");
    const trend = read("client/src/lib/settlementTrendDisplay.ts");
    expect(overview).toContain("formatAverageCheck");
    expect(overview).toContain("summary.averageCheck");
    expect(overview).not.toContain("grandTotal");
    expect(overview).not.toContain("totalAmount");
    expect(trend).toContain("point.revenue");
    expect(trend).toContain("paidCheckCount");
    expect(trend).not.toContain("dining_sessions");
  });

  it("Home + Reports tabs wire presentation components (not inline builders)", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(dashboard).toContain("OperationalSnapshotSection");
    expect(dashboard).toContain("ReportsTab");
    expect(dashboard).not.toContain("function buildOrderStatistics");
    expect(dashboard).not.toContain("function RestaurantStatisticsSection");
  });

  it("does not modify Reporting Platform / Order / Check write surfaces in this program", () => {
    // Adoption is presentation-only: guards assert consumer files exist and platform router remains mounted.
    const routers = read("server/routers.ts");
    expect(routers).toContain("reporting: reportingRouter");
    expect(routers).toContain("ops: opsRouter");
  });
});

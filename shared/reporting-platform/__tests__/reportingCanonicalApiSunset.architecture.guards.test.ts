/**
 * REPORTING-CANONICAL-API-SUNSET-1 — prevent new consumption of legacy reporting APIs.
 * COMPATIBILITY-CLEANUP-1 — ops settlement surfaces hard-deleted.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_RESTAURANT_KPI_CLIENT_APIS,
  LEGACY_REPORTING_SURFACES,
  REPORTING_CANONICAL_API_SUNSET_PROGRAM_ID,
  listArchitecturalGaps,
  listSoftSunsetUnusedSurfaces,
} from "../legacyReportingSurfaces";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listFiles(dirRel: string): string[] {
  const abs = join(repoRoot, dirRel);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const rel = `${dirRel}/${name}`.replace(/\\/g, "/");
    const full = join(repoRoot, rel);
    if (statSync(full).isDirectory()) {
      out.push(...listFiles(rel));
      continue;
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

function isTestOrGuardFile(rel: string): boolean {
  return (
    rel.includes("__tests__") ||
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx") ||
    rel.endsWith(".architecture.guards.test.ts")
  );
}

describe("REPORTING-CANONICAL-API-SUNSET-1 architecture guards", () => {
  it("registers soft-sunset inventory and program id", () => {
    const registry = read(
      "shared/reporting-platform/legacyReportingSurfaces.ts"
    );
    expect(registry).toContain(REPORTING_CANONICAL_API_SUNSET_PROGRAM_ID);
    expect(LEGACY_REPORTING_SURFACES.length).toBeGreaterThanOrEqual(6);
    expect(listSoftSunsetUnusedSurfaces().length).toBeGreaterThanOrEqual(3);
    expect(listArchitecturalGaps().some((g) => g.gapProgram)).toBe(true);
  });

  it("ops settlement procedures and settlementMetrics are hard-deleted", () => {
    const ops = read("server/ops/opsRouter.ts");
    expect(ops).not.toContain("getSettlementSummary");
    expect(ops).not.toContain("getSettlementTrend");
    expect(ops).not.toContain("getSettlementBreakdown");
    expect(
      existsSync(join(repoRoot, "server/analytics/settlementMetrics.ts"))
    ).toBe(false);
    const queryRuntime = read("client/src/lib/queryRuntime.ts");
    expect(queryRuntime).not.toContain("opsSettlementSummaryQueryOptions");
    expect(queryRuntime).not.toContain("opsSettlementTrendQueryOptions");
  });

  it("restaurant Dashboard / Reports / exports forbid legacy settlement KPI APIs", () => {
    const roots = [
      "client/src/components/dashboard",
      "client/src/lib/reporting-exports",
      "client/src/lib/reporting",
      "client/src/pages/Dashboard.tsx",
    ];
    for (const root of roots) {
      const files = root.endsWith(".tsx") ? [root] : listFiles(root);
      for (const file of files) {
        if (isTestOrGuardFile(file)) continue;
        const src = read(file);
        for (const forbidden of FORBIDDEN_RESTAURANT_KPI_CLIENT_APIS) {
          expect(src, `${file} must not contain ${forbidden}`).not.toContain(
            forbidden
          );
        }
        expect(src, file).not.toMatch(/ops\.getSettlement/);
      }
    }
  });

  it("client production sources do not call admin.getRevenueByMonth", () => {
    for (const file of listFiles("client/src")) {
      if (isTestOrGuardFile(file)) continue;
      if (file.includes("legacyReportingSurfaces")) continue;
      const src = read(file);
      expect(src, file).not.toContain("admin.getRevenueByMonth");
      expect(src, file).not.toContain("getRevenueByMonth(");
    }
  });

  it("client production sources do not import opsSettlement*QueryOptions", () => {
    for (const file of listFiles("client/src")) {
      if (isTestOrGuardFile(file)) continue;
      const src = read(file);
      expect(src, file).not.toContain("opsSettlementSummaryQueryOptions");
      expect(src, file).not.toContain("opsSettlementTrendQueryOptions");
    }
  });

  it("Dashboard KPI values still come from reporting.*", () => {
    const overview = read(
      "client/src/components/dashboard/SettlementOverviewSection.tsx"
    );
    const trends = read(
      "client/src/components/dashboard/SettlementTrendsSection.tsx"
    );
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(overview).toContain("trpc.reporting.getBusinessMetricsSummary");
    expect(trends).toContain("trpc.reporting.getBusinessMetricsTrend");
    expect(reports).toContain("trpc.reporting.getBusinessMetricsSummary");
    expect(reports).toContain("trpc.reporting.getOrderSalesRollup");
  });
});

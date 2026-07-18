/**
 * REPORTING-KPI-GOVERNANCE-1 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KPI_DICTIONARY,
  KPI_GOVERNANCE_PROGRAM_ID,
  getKpiDefinition,
} from "../kpiDictionary";

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

describe("REPORTING-KPI-GOVERNANCE-1 architecture guards", () => {
  it("registry is governance-complete and exported from shared package", () => {
    const dict = read("shared/reporting-platform/kpiDictionary.ts");
    const index = read("shared/reporting-platform/index.ts");
    expect(dict).toContain(KPI_GOVERNANCE_PROGRAM_ID);
    expect(dict).toContain("calculationVersion");
    expect(dict).toContain("formula");
    expect(dict).toContain("sourceService");
    expect(index).toContain("listKpiMetadata");
    expect(index).toContain("KpiCatalogDto");
    expect(getKpiDefinition("revenue").calculationVersion).toBeGreaterThanOrEqual(1);
    expect(KPI_DICTIONARY.paidCheckCount.ownerDomain).toBe("check");
  });

  it("Reporting API exposes getKpiCatalog metadata endpoint", () => {
    const router = read("server/reporting-platform/reportingRouter.ts");
    const service = read("server/reporting-platform/KpiGovernanceService.ts");
    expect(router).toContain("getKpiCatalog");
    expect(service).toContain("listKpiMetadata");
    expect(service).toContain("Does not compute KPI values");
  });

  it("Dashboard consumes reporting.* and canonical KPI labels helper", () => {
    const overview = read(
      "client/src/components/dashboard/SettlementOverviewSection.tsx"
    );
    const ops = read(
      "client/src/components/dashboard/OperationalSnapshotSection.tsx"
    );
    const display = read("client/src/lib/reporting/kpiDisplay.ts");
    expect(overview).toContain("reporting.getBusinessMetricsSummary");
    expect(overview).toContain("kpiDisplayName");
    expect(ops).toContain("reporting.getOrderSalesSummary");
    expect(ops).toContain("kpiDisplayName");
    expect(display).toContain("preferredKpiLabel");
    expect(display).not.toMatch(/\.reduce\s*\(/);
  });

  it("presentation export layer does not invent Revenue formulas", () => {
    for (const file of listFiles("client/src/lib/reporting-exports")) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toContain("outcome === \"paid\"");
      expect(src, file).not.toContain("dining_sessions");
      expect(src, file).not.toMatch(/ops\.getSettlement/);
    }
  });

  it("legacy settlement metrics are marked non-canonical for Revenue", () => {
    const settlement = read("server/analytics/settlementMetrics.ts");
    expect(settlement).toContain("REPORTING-KPI-GOVERNANCE-1");
    expect(settlement).toContain("NON-CANONICAL");
    expect(settlement).toContain("getBusinessMetricsSummary");
  });
});

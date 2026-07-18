/**
 * REPORTING-DESIGN-LANGUAGE-1 — presentation-only architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

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

describe("REPORTING-DESIGN-LANGUAGE-1 architecture guards", () => {
  it("Excel uses the new design language with five sheets and Node charts", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const chart = read(
      "client/src/lib/reporting-exports/charts/renderTrendChartPng.ts"
    );
    expect(excel).toContain("REPORTING-DESIGN-LANGUAGE-1");
    expect(excel).toContain("REPORTING-PERIOD-CONSISTENCY-1");
    expect(excel).toContain("scopedOrderSalesFromRollup");
    expect(excel).toContain("COLS = 14");
    expect(excel).toContain("writeKpiCards");
    expect(excel).toContain("maybeAddChartImage");
    expect(excel).toContain("writeInsufficientPanel");
    expect(excel).toContain("buildCoverSheet");
    expect(excel).toContain("buildExecutiveSheet");
    expect(excel).toContain("buildFinancialSheet");
    expect(excel).toContain("buildOrderSalesSheet");
    expect(excel).toContain("buildRevenueTrendSheet");
    expect(excel).toContain("Does not calculate Revenue");
    expect(excel).not.toContain("orderSales.month");
    expect(excel).not.toContain("FF0B1F33"); // legacy navy palette removed
    expect(excel).not.toContain("FFB8943F"); // legacy gold palette removed
    expect(excel).not.toMatch(/\.reduce\s*\(/);
    expect(chart).toContain("REPORTING-DESIGN-LANGUAGE-1");
    expect(chart).toContain("renderPurePng");
    expect(chart).toContain("#0D9488");
  });

  it("does not modify platform contracts, routers, or domain calculation paths", () => {
    const contracts = read("shared/reporting-platform/reportingContracts.ts");
    const routers = read("server/routers.ts");
    expect(contracts).toContain("BusinessMetricsSummary");
    expect(routers).toContain("reporting: reportingRouter");
    expect(contracts).not.toContain("REPORTING-DESIGN-LANGUAGE-1");
  });

  it("presentation layer remains free of domain/API coupling", () => {
    for (const file of listFiles("client/src/lib/reporting-exports")) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toMatch(/ops\.getSettlement/);
      expect(src, file).not.toContain("order.list");
      expect(src, file).not.toContain("grandTotal");
      expect(src, file).not.toMatch(/\.reduce\s*\(/);
    }
  });
});

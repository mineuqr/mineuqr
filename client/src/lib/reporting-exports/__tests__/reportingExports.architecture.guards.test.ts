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

describe("REPORTING-EXPORTS-1 architecture guards", () => {
  it("ReportsTab exports via reporting-exports and reporting.* only", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toContain("downloadReportingExportXlsx");
    expect(reports).toContain("exportScopeXlsx");
    expect(reports).not.toContain("downloadReportingExportPdf");
    expect(reports).toContain("reporting.getBusinessMetricsSummary");
    expect(reports).toContain("reporting.getBusinessMetricsTrend");
    expect(reports).toContain("reporting.getOrderSalesRollup");
    expect(reports).toContain("reporting.getPaymentMethodAnalytics");
    expect(reports).not.toContain("downloadSalesReportXlsx");
    expect(reports).not.toMatch(/ops\.getSettlement/);
    expect(reports).not.toContain("order.list");
    expect(reports).not.toContain("buildOrderStatistics");
    expect(reports).not.toContain(".reduce(");
  });

  it("reporting-exports package never calculates Revenue or calls legacy settlement", () => {
    for (const file of listFiles("client/src/lib/reporting-exports")) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toMatch(/ops\.getSettlement/);
      expect(src, file).not.toContain("order.list");
      expect(src, file).not.toContain("grandTotal");
      expect(src, file).not.toContain("dining_sessions");
      expect(src, file).not.toMatch(/\.reduce\s*\(/);
    }
  });

  it("Excel/PDF renderers are presentation-only and consume DTO bundle", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const format = read("client/src/lib/reporting-exports/format.ts");
    expect(excel).toContain("Does not calculate Revenue");
    expect(pdf).toContain("Does not calculate Revenue");
    expect(excel).toContain("bundle.business");
    expect(pdf).toContain("bundle.business");
    expect(format).toContain("sampleTaxPolicySnapshot");
    expect(format).toContain("currencySnapshot");
    expect(format).toContain("never live Business Settings");
  });

  it("does not redesign Reporting Platform / Order / Check / Runtime", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("reporting: reportingRouter");
    const excelPkg = read("client/src/lib/reporting-exports/index.ts");
    expect(excelPkg).not.toContain("server/reporting-platform");
  });
});

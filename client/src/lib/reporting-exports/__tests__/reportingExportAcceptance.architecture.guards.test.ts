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

describe("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 architecture guards", () => {
  it("Excel workbook is executive-only — five sheets, no Ops/Catalog", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toMatch(/REPORTING-PERIOD-CONSISTENCY-1|ACCEPTANCE-2/);
    expect(excel).toContain("buildCoverSheet");
    expect(excel).toContain("buildExecutiveSheet");
    expect(excel).toContain("buildFinancialSheet");
    expect(excel).toContain("buildOrderSalesSheet");
    expect(excel).toContain("buildRevenueTrendSheet");
    expect(excel).toContain("hasRenderableTrend");
    expect(excel).toContain("formatTrendAxisLabel");
    expect(excel).toContain("scopedOrderSalesFromRollup");
    expect(excel).not.toContain("buildOperationalSheet");
    expect(excel).not.toContain("buildCatalogSheet");
    expect(excel).not.toContain("catalogPlaceholder");
    expect(excel).not.toContain("orderSales.month");
    expect(excel).not.toMatch(/\.reduce\s*\(/);
  });

  it("PDF exporter is suspended — Excel is the deliverable", () => {
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const download = read(
      "client/src/lib/reporting-exports/downloadReportingExport.ts"
    );
    expect(pdf).toContain("SUSPENDED");
    expect(download).toContain("PDF reporting export is suspended");
  });

  it("period presentation enforces month/year business labels", () => {
    const period = read("client/src/lib/reporting-exports/periodPresentation.ts");
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(period).toContain("Monthly Report");
    expect(period).toContain("Annual Report");
    expect(period).toContain('"Jul"');
    expect(period).toContain("MIN_TREND_OBSERVATIONS");
    expect(reports).toContain("String(reportYear)");
    expect(reports).not.toContain("`Year ${reportYear}`");
    expect(reports).not.toContain("`السنة ${reportYear}`");
  });

  it("presentation-only — no platform/domain coupling", () => {
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

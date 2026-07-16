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

describe("REPORTING-PERIOD-CONSISTENCY-1 architecture guards", () => {
  it("Excel uses scoped rollup Order Sales — never OrderSalesSummary.month", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const types = read("client/src/lib/reporting-exports/types.ts");
    const scope = read("client/src/lib/reporting-exports/scopeTotals.ts");
    expect(excel).toContain("REPORTING-PERIOD-CONSISTENCY-1");
    expect(excel).toContain("scopedOrderSalesFromRollup");
    expect(excel).not.toContain("orderSales.month");
    expect(excel).not.toMatch(/bundle\.orderSales[^R]/);
    expect(types).not.toContain("OrderSalesSummaryDto");
    expect(types).toContain("orderSalesRollup");
    expect(scope).toContain("never from OrderSalesSummary.month");
  });

  it("ReportsTab exports Excel only — PDF suspended", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    const download = read(
      "client/src/lib/reporting-exports/downloadReportingExport.ts"
    );
    expect(reports).toContain("downloadReportingExportXlsx");
    expect(reports).toContain("exportScopeXlsx");
    expect(reports).not.toContain("downloadReportingExportPdf");
    expect(reports).not.toMatch(/exportScope\([^)]*"pdf"/);
    expect(download).toContain("PDF reporting export is suspended");
  });

  it("presentation-only — no platform/domain coupling or reduce", () => {
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

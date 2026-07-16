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

describe("REPORTING-EXPORT-TEMPLATES architecture guards (superseded by ACCEPTANCE-2)", () => {
  it("enterprise Excel template includes cover, KPI cards, print setup, charts", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toMatch(
      /REPORTING-EXCEL-UX-POLISH-1|REPORTING-PERIOD-CONSISTENCY-1|REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-[12]/
    );
    expect(excel).toContain("buildCoverSheet");
    expect(excel).toContain("writeKpiCards");
    expect(excel).toContain("applyPrintSetup");
    expect(excel).toContain("maybeAddChartImage");
    expect(excel).toContain("Does not calculate Revenue");
    expect(excel).not.toMatch(/\.reduce\s*\(/);
  });

  it("enterprise PDF template includes cover meta, tables, charts, page footer", () => {
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    expect(pdf).toMatch(
      /SUSPENDED|REPORTING-PERIOD-CONSISTENCY-1|REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-[12]/
    );
    expect(pdf).toContain("kpiCards");
    expect(pdf).toContain("generatedBy");
    expect(pdf).toContain("Does not calculate Revenue");
    expect(pdf).not.toMatch(/\.reduce\s*\(/);
  });

  it("branding is restaurant-driven (logoUrl) with MineuQR image fallback", () => {
    const branding = read("client/src/lib/reporting-exports/branding.ts");
    const types = read("client/src/lib/reporting-exports/types.ts");
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(types).toContain("logoUrl");
    expect(branding).toContain("resolveExportLogoAsset");
    expect(reports).toContain("logoUrl");
    expect(branding).toContain("mineuqr-logo.png");
  });

  it("templates remain presentation-only across reporting-exports", () => {
    for (const file of listFiles("client/src/lib/reporting-exports")) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toMatch(/ops\.getSettlement/);
      expect(src, file).not.toContain("order.list");
      expect(src, file).not.toContain("grandTotal");
      expect(src, file).not.toMatch(/\.reduce\s*\(/);
    }
  });

  it("does not modify Reporting Platform contracts or routers", () => {
    const contracts = read("shared/reporting-platform/reportingContracts.ts");
    const routers = read("server/routers.ts");
    expect(contracts).toContain("BusinessMetricsSummary");
    expect(routers).toContain("reporting: reportingRouter");
    expect(contracts).not.toContain("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2");
  });

  it("enforces Western digits export policy in format helpers and templates", () => {
    const format = read("client/src/lib/reporting-exports/format.ts");
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const shared = read("shared/utils/numericPresentation.ts");
    expect(format).toContain("Western digits");
    expect(format).toContain("@shared/utils/numericPresentation");
    expect(format).toContain("toWesternDigits");
    expect(shared).toContain('WESTERN_NUMBERING_SYSTEM = "latn"');
    expect(excel).toContain("toWesternDigits");
    expect(excel).toContain("formatExportDateTime");
    expect(pdf).toContain("toWesternDigits");
    expect(pdf).toContain("formatExportDateTime");
  });
});

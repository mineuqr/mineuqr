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

describe("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 architecture guards", () => {
  it("Excel presentation uses Western text cells and executive KPI cards", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    expect(excel).toContain("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1");
    expect(excel).toContain("setWesternText");
    expect(excel).toContain('numFmt = "@"');
    expect(excel).toContain("writeKpiCards");
    expect(excel).toContain("buildCoverSheet");
    expect(excel).toContain("resolveExportLogoAsset");
    expect(excel).not.toContain("revenueVsOrderSales");
    expect(excel).not.toMatch(/Revenue\s*=\s*Paid Check/i);
    expect(excel).not.toMatch(/\.reduce\s*\(/);
  });

  it("PDF presentation uses Cairo, logo asset, and KPI cards", () => {
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const arabic = read("client/src/lib/reporting-exports/pdf/arabicPdfText.ts");
    const branding = read("client/src/lib/reporting-exports/branding.ts");
    expect(pdf).toContain("REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1");
    expect(pdf).toContain("loadExportFontBytes");
    expect(pdf).toContain("kpiCards");
    expect(pdf).toContain("resolveExportLogoAsset");
    expect(pdf).toContain("generatedBy");
    expect(pdf).toContain("preparePdfText");
    expect(arabic).toContain("convertArabic");
    expect(arabic).toContain("getReorderedString");
    expect(branding).toContain("mineuqr-logo.png");
    expect(branding).toContain('source: "mineuqr"');
    expect(pdf).not.toContain("revenueVsOrderSales");
    expect(pdf).not.toMatch(/Revenue\s*=\s*Paid Check/i);
  });

  it("labels omit engineering documentation copy", () => {
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(labels).not.toContain("revenueVsOrderSales");
    expect(labels).not.toMatch(/Order Sales ≠ Revenue/);
    expect(labels).not.toMatch(/Paid Check grandTotal/i);
    expect(labels).toContain("coverSubtitle");
    expect(labels).toContain("businessName");
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

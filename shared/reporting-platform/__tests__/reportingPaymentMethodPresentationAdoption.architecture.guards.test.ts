import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MONETARY_PAYMENT_METHODS } from "../../operational-session";
import {
  PAYMENT_METHOD_LABELS,
  SECTION_TERMINOLOGY,
} from "../productSemantics";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PERIOD_SPECIFIC =
  /\b(daily|weekly|monthly|quarterly|annual|yearly|month|week|quarter|year)\b/i;

describe("REPORTING-PAYMENT-METHOD-PRESENTATION-ADOPTION-1 guards", () => {
  it("keeps Check Revenue formula; captured tenders are Collection Fact", () => {
    expect(getKpiDefinition("revenue").formula).toContain("grandTotal");
    expect(getKpiDefinition("revenue").formula).toContain("settlement_records");
    const service = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(service).toContain("listProductionCollectionFactTenderLinesForReporting");
    expect(service).toContain("REPORTING-PAYMENT-METHOD-ANALYTICS-1");
  });

  it("Dashboard, Excel, PDF share the presentation view model", () => {
    const helper = read(
      "client/src/lib/reporting-exports/paymentMethodAnalysisPresentation.ts"
    );
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const dash = read(
      "client/src/components/dashboard/PaymentMethodAnalysisSection.tsx"
    );
    expect(helper).toContain("buildPaymentMethodAnalysisViewModel");
    expect(helper).toContain("MONETARY_PAYMENT_METHODS");
    expect(helper).toContain("toCanonicalPaymentMethod");
    expect(helper).toContain("preferredPaymentMethodLabel");
    expect(helper).not.toMatch(/scope\s*===/);
    expect(excel).toContain("buildPaymentMethodAnalysisViewModel");
    expect(pdf).toContain("buildPaymentMethodAnalysisViewModel");
    expect(dash).toContain("buildPaymentMethodAnalysisViewModel");
    expect(dash).toContain("getPaymentMethodAnalytics");
  });

  it("Product Semantics owns method labels and empty copy", () => {
    for (const method of MONETARY_PAYMENT_METHODS) {
      expect(PAYMENT_METHOD_LABELS[method]).toBeTruthy();
    }
    expect(PAYMENT_METHOD_LABELS.complimentary).toBeTruthy();
    expect(SECTION_TERMINOLOGY.en.paymentAnalyticsEmpty).not.toMatch(
      PERIOD_SPECIFIC
    );
    expect(SECTION_TERMINOLOGY.ar.paymentAnalyticsEmpty).not.toMatch(
      PERIOD_SPECIFIC
    );
    const dash = read(
      "client/src/components/dashboard/PaymentMethodAnalysisSection.tsx"
    );
    expect(dash).not.toContain("No settlement tenders in this period");
    expect(dash).toContain("paymentAnalyticsLoadError");
  });

  it("Payment Method Analysis is not on Executive Summary", () => {
    const executive = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    expect(executive).not.toContain("paymentMethod");
    expect(executive).not.toContain("PaymentMethod");
  });
});

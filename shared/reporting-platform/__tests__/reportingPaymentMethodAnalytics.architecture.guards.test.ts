import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAYMENT_METHOD_LABELS,
  preferredPaymentMethodLabel,
  SECTION_TERMINOLOGY,
} from "../productSemantics";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-PAYMENT-METHOD-ANALYTICS-1 architecture guards", () => {
  it("Check Revenue formula remains paid Check.grandTotal", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.formula).toContain("grandTotal");
    expect(revenue.formula).toMatch(/paid/i);
    expect(revenue.calculationVersion).toBe(1);
  });

  it("analytics service reads Collection Fact tenders for captured Cashier sales", () => {
    const service = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(service).toContain("listProductionCollectionFactTenderLinesForReporting");
    expect(service).toContain("REPORTING-PAYMENT-METHOD-ANALYTICS-1");
    expect(service).toContain("ST-TENDER-PROJECTION-CLEANUP-1");
    expect(service).toContain("listRefundSettlementRecordPaymentLinesForReporting");
    expect(service).not.toMatch(/from\(["']orders["']\)/);
    expect(service).not.toMatch(/dining_sessions/);
    expect(service).not.toMatch(/operational_checks/);
  });

  it("router exposes getPaymentMethodAnalytics without replacing revenue APIs", () => {
    const router = read("server/reporting-platform/reportingRouter.ts");
    expect(router).toContain("getPaymentMethodAnalytics");
    expect(router).toContain("getBusinessMetricsSummary");
    expect(router).toContain(
      "Does not replace BusinessMetricsSummary.revenue"
    );
  });

  it("Product Semantics owns payment method + section terminology", () => {
    expect(SECTION_TERMINOLOGY.en.paymentMethodAnalysis).toBe(
      "Payment Analytics"
    );
    expect(preferredPaymentMethodLabel("mada", "en")).toBe(
      "Card (network / bank)"
    );
    expect(preferredPaymentMethodLabel("card", "ar")).toBe(
      "بطاقة (شبكة / بنك)"
    );
    expect(preferredPaymentMethodLabel("cash", "ar")).toBe("نقدًا");
    expect(Object.keys(PAYMENT_METHOD_LABELS)).toEqual(
      expect.arrayContaining(["cash", "card", "other", "complimentary"])
    );
    expect(Object.keys(PAYMENT_METHOD_LABELS)).not.toContain("mada");
    const labels = read("client/src/lib/reporting-exports/labels.ts");
    expect(labels).toContain("section.paymentMethodAnalysis");
    expect(labels).not.toMatch(/paymentMethodAnalysis:\s*"Payment Method Analysis"/);
  });

  it("Excel/PDF/Dashboard present Payment Method Analysis outside Executive", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const executive = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    const dashboard = read(
      "client/src/components/dashboard/PaymentMethodAnalysisSection.tsx"
    );
    expect(excel).toContain("buildPaymentMethodSheet");
    expect(excel).toContain("buildPaymentMethodAnalysisViewModel");
    expect(pdf).toContain("paymentMethodAnalysis");
    expect(pdf).toContain("buildPaymentMethodAnalysisViewModel");
    expect(dashboard).toContain("getPaymentMethodAnalytics");
    expect(dashboard).toContain("buildPaymentMethodAnalysisViewModel");
    expect(dashboard).toContain("SECTION_TERMINOLOGY");
    expect(executive).not.toContain("paymentMethod");
    expect(executive).not.toContain("PaymentMethod");
  });

  it("export bundle requires PaymentMethodAnalyticsDto", () => {
    const types = read("client/src/lib/reporting-exports/types.ts");
    expect(types).toContain("paymentMethodAnalytics: PaymentMethodAnalyticsDto");
  });
});

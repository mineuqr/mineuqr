import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SETTLEMENT-RECORD-REPORTING-ADOPTION-1 architecture guards", () => {
  it("Revenue / Tax / Paid Checks formulas point at settlement_records", () => {
    for (const id of ["revenue", "taxCollected", "paidCheckCount"] as const) {
      const kpi = getKpiDefinition(id);
      expect(kpi.formula).toContain("settlement_records");
      expect(kpi.sourceOfTruth.toLowerCase()).toContain("settlement_records");
    }
  });

  it("Business Metrics loads Settlement Record publication adapter", () => {
    const biz = read("server/reporting-platform/BusinessMetricsService.ts");
    const adapter = read(
      "server/reporting-platform/settlementRecordReportingAdapter.ts"
    );
    expect(biz).toContain("listSettlementRecordsForReporting");
    expect(biz).toContain("SETTLEMENT-RECORD-REPORTING-ADOPTION-1");
    expect(adapter).toContain("publicationSource: \"settlement_record\"");
    expect(adapter).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
  });

  it("Payment analytics loads Settlement Record payment snapshots", () => {
    const pay = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(pay).toContain("listSettlementRecordPaymentLinesForReporting");
    expect(pay).toContain("SETTLEMENT-RECORD-REPORTING-ADOPTION-1");
  });

  it("Order Sales / Operational metrics remain Order Read owned", () => {
    const orderSales = read(
      "server/reporting-platform/OrderSalesMetricsService.ts"
    );
    const ops = read(
      "server/reporting-platform/OperationalMetricsService.ts"
    );
    expect(orderSales).not.toContain("listSettlementRecordsForReporting");
    expect(ops).not.toContain("listSettlementRecordsForReporting");
    expect(getKpiDefinition("orderSales").ownerDomain).toBe("order_read");
  });

  it("Dashboard / Excel / PDF still consume reporting contracts (no layout redesign)", () => {
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    const settlement = read(
      "client/src/components/dashboard/SettlementOverviewSection.tsx"
    );
    expect(excel).toContain("buildExecutiveSheet");
    expect(excel).toContain("buildFinancialSheet");
    expect(excel).toContain("buildPaymentMethodSheet");
    expect(pdf).toContain("buildReportingExportPdf");
    expect(settlement).toContain("getBusinessMetricsSummary");
  });
});

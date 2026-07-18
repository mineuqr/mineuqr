/**
 * REPORTING-KPI-GOVERNANCE-1 — registry integrity tests.
 */
import { describe, expect, it } from "vitest";
import {
  KPI_CALCULATION_VERSION_BASELINE,
  KPI_DICTIONARY,
  KPI_GOVERNANCE_PROGRAM_ID,
  NON_CANONICAL_REVENUE_SURFACES,
  getKpiDefinition,
  listAllKpis,
  listKpiMetadata,
  listKpisByContract,
  listKpisByOwner,
} from "../kpiDictionary";

describe("REPORTING-KPI-GOVERNANCE-1 registry", () => {
  it("exposes governance program id and baseline calculation versions", () => {
    expect(KPI_GOVERNANCE_PROGRAM_ID).toBe("REPORTING-KPI-GOVERNANCE-1");
    for (const kpi of listAllKpis()) {
      expect(kpi.calculationVersion).toBeGreaterThanOrEqual(
        KPI_CALCULATION_VERSION_BASELINE
      );
      expect(kpi.formula.length).toBeGreaterThan(0);
      expect(kpi.sourceService.length).toBeGreaterThan(0);
      expect(kpi.sourceDto).toBeTruthy();
      expect(kpi.owner).toBeTruthy();
      expect(kpi.unit).toBeTruthy();
      expect(kpi.aggregation).toBeTruthy();
      expect(kpi.availability).toMatch(/^(ga|planned)$/);
    }
  });

  it("Revenue is Check-owned with paid grandTotal formula", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.owner).toBe("Check Management");
    expect(revenue.ownerDomain).toBe("check");
    expect(revenue.formula).toContain("grandTotal");
    expect(revenue.formula).toContain("paid");
    expect(revenue.sourceService).toBe("getBusinessMetricsSummary");
    expect(revenue.notDefinedAs).toEqual(
      expect.arrayContaining([
        "Served order totals",
        "ops.getSettlement* / Session totalAmount",
      ])
    );
  });

  it("Order Sales is Order Read owned and not Revenue", () => {
    const orderSales = getKpiDefinition("orderSales");
    expect(orderSales.ownerDomain).toBe("order_read");
    expect(orderSales.owner).toBe("Order Read");
    expect(orderSales.notDefinedAs).toEqual(
      expect.arrayContaining(["Revenue", "Paid Check grand totals"])
    );
  });

  it("derived KPIs declare dependsOn", () => {
    expect(KPI_DICTIONARY.averageCheck.dependsOn).toEqual(
      expect.arrayContaining(["revenue", "paidCheckCount"])
    );
    expect(KPI_DICTIONARY.averageOrder.dependsOn).toEqual(
      expect.arrayContaining(["orderSales", "completedOrders"])
    );
  });

  it("metadata catalog covers every registry entry", () => {
    const meta = listKpiMetadata();
    expect(meta.length).toBe(Object.keys(KPI_DICTIONARY).length);
    expect(listKpisByOwner("check").length).toBeGreaterThanOrEqual(6);
    expect(listKpisByContract("BusinessMetricsSummary").length).toBeGreaterThanOrEqual(
      6
    );
  });

  it("documents non-canonical settlement surfaces", () => {
    expect(NON_CANONICAL_REVENUE_SURFACES).toEqual(
      expect.arrayContaining([
        "ops.getSettlementSummary",
        "server/analytics/settlementMetrics.ts (Session totalAmount)",
      ])
    );
  });
});

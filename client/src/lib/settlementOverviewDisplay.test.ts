import { describe, expect, it } from "vitest";
import {
  formatAverageCheck,
  formatAveragePaidSessionValue,
  formatComplimentaryRate,
  formatSettlementRevenue,
  isSettlementOverviewEmpty,
  type BusinessMetricsSummaryData,
} from "./settlementOverviewDisplay";

const baseSummary = (
  overrides: Partial<BusinessMetricsSummaryData> = {}
): BusinessMetricsSummaryData => ({
  contractVersion: 1,
  contractId: "BusinessMetricsSummary",
  generatedAt: "2026-06-18T22:00:00.000Z",
  restaurantId: 1,
  from: null,
  to: null,
  revenue: "0.00",
  paidCheckCount: 0,
  averageCheck: "0.00",
  taxCollected: "0.00",
  complimentaryCount: 0,
  complimentaryAmount: "0.00",
  voidedCount: 0,
  refundPublishedTotal: "0.00",
  refundPublicationCount: 0,
  netRevenue: "0.00",
  refundRate: "0.00",
  currency: { currencySnapshot: null },
  sampleTaxPolicySnapshot: null,
  ...overrides,
});

describe("settlementOverviewDisplay REPORTING-DASHBOARD-ADOPTION-1", () => {
  it("formats complimentary rate from check counts", () => {
    expect(
      formatComplimentaryRate(
        baseSummary({
          paidCheckCount: 3,
          complimentaryCount: 1,
        })
      )
    ).toBe("25.0%");
  });

  it("returns dash when no settled checks", () => {
    expect(formatComplimentaryRate(baseSummary())).toBe("—");
  });

  it("uses Reporting Platform averageCheck", () => {
    expect(
      formatAverageCheck(
        baseSummary({
          paidCheckCount: 2,
          revenue: "60.00",
          averageCheck: "30.00",
        })
      )
    ).toBe("30.00");
    expect(
      formatAveragePaidSessionValue(
        baseSummary({
          paidCheckCount: 2,
          averageCheck: "30.00",
        })
      )
    ).toBe("30.00");
  });

  it("returns dash when there are no paid checks", () => {
    expect(formatAverageCheck(baseSummary())).toBe("—");
  });

  it("formats revenue with currency symbol", () => {
    expect(formatSettlementRevenue("120.00", "SAR")).toBe("120.00 SAR");
    expect(formatSettlementRevenue("120.00", "")).toBe("120.00 ر.س");
  });

  it("detects empty business overview", () => {
    expect(isSettlementOverviewEmpty(baseSummary())).toBe(true);
    expect(
      isSettlementOverviewEmpty(
        baseSummary({ paidCheckCount: 1, revenue: "10.00" })
      )
    ).toBe(false);
  });
});

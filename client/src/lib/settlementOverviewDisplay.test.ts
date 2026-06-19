import { describe, expect, it } from "vitest";
import {
  formatAveragePaidSessionValue,
  formatComplimentaryRate,
  formatSettlementRevenue,
  isSettlementOverviewEmpty,
  type SettlementSummaryData,
} from "./settlementOverviewDisplay";

const baseSummary = (
  overrides: Partial<SettlementSummaryData> = {}
): SettlementSummaryData => ({
  generatedAt: "2026-06-18T22:00:00.000Z",
  paidSessionCount: 0,
  complimentarySessionCount: 0,
  totalSettledSessions: 0,
  paidRevenue: "0.00",
  complimentaryTotalAmount: "0.00",
  ...overrides,
});

describe("settlementOverviewDisplay SETTLEMENT-ARCHITECTURE-1B.3", () => {
  it("formats complimentary rate from summary counts", () => {
    expect(
      formatComplimentaryRate(
        baseSummary({
          paidSessionCount: 3,
          complimentarySessionCount: 1,
          totalSettledSessions: 4,
        })
      )
    ).toBe("25.0%");
  });

  it("returns dash when no settled sessions", () => {
    expect(formatComplimentaryRate(baseSummary())).toBe("—");
  });

  it("formats average paid session value from paid revenue", () => {
    expect(
      formatAveragePaidSessionValue(
        baseSummary({
          paidSessionCount: 2,
          paidRevenue: "60.00",
        })
      )
    ).toBe("30.00");
  });

  it("returns dash when there are no paid sessions", () => {
    expect(formatAveragePaidSessionValue(baseSummary())).toBe("—");
  });

  it("formats revenue with currency symbol", () => {
    expect(formatSettlementRevenue("120.00", "SAR")).toBe("120.00 SAR");
    expect(formatSettlementRevenue("120.00", "")).toBe("120.00 ر.س");
  });

  it("detects empty settlement overview", () => {
    expect(isSettlementOverviewEmpty(baseSummary())).toBe(true);
    expect(
      isSettlementOverviewEmpty(
        baseSummary({ totalSettledSessions: 1, paidSessionCount: 1 })
      )
    ).toBe(false);
  });
});

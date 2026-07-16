import { describe, expect, it } from "vitest";
import {
  buildSettlementTrendChartRows,
  findHighestComplimentaryPeriod,
  findHighestRevenuePeriod,
  findHighestSettlementPeriod,
  formatTrendPeriodLabel,
  isSettlementTrendEmpty,
  type BusinessMetricsTrendData,
} from "./settlementTrendDisplay";

const trend = (
  points: BusinessMetricsTrendData["points"],
  grouping: BusinessMetricsTrendData["grouping"] = "day"
): BusinessMetricsTrendData => ({
  contractVersion: 1,
  contractId: "BusinessMetricsTrend",
  generatedAt: "2026-06-18T22:00:00.000Z",
  restaurantId: 1,
  from: null,
  to: null,
  grouping,
  points,
});

describe("settlementTrendDisplay REPORTING-DASHBOARD-ADOPTION-1", () => {
  it("formats day, week, and month period labels", () => {
    expect(formatTrendPeriodLabel("2026-06-01", "day", "en")).toMatch(/Jun/);
    expect(formatTrendPeriodLabel("2026-06", "month", "en")).toMatch(/2026/);
    expect(formatTrendPeriodLabel("2026-W23", "week", "en")).toBe("W23 2026");
  });

  it("builds chart rows from Reporting Trend DTO", () => {
    const rows = buildSettlementTrendChartRows(
      trend([
        {
          periodKey: "2026-06-01",
          periodStart: "2026-06-01T00:00:00.000Z",
          paidCheckCount: 2,
          complimentaryCount: 1,
          voidedCount: 0,
          revenue: "60.00",
          taxCollected: "0.00",
        },
      ]),
      "en"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.paidRevenue).toBe(60);
    expect(rows[0]?.paidSessionCount).toBe(2);
    expect(rows[0]?.complimentarySessionCount).toBe(1);
    expect(rows[0]?.totalSettledSessions).toBe(3);
    expect(rows[0]?.complimentaryRate).toBeCloseTo(33.33, 2);
  });

  it("finds highest revenue, activity, and complimentary periods", () => {
    const rows = buildSettlementTrendChartRows(
      trend([
        {
          periodKey: "2026-06-01",
          periodStart: "2026-06-01T00:00:00.000Z",
          paidCheckCount: 1,
          complimentaryCount: 0,
          voidedCount: 0,
          revenue: "40.00",
          taxCollected: "0.00",
        },
        {
          periodKey: "2026-06-02",
          periodStart: "2026-06-02T00:00:00.000Z",
          paidCheckCount: 2,
          complimentaryCount: 3,
          voidedCount: 0,
          revenue: "80.00",
          taxCollected: "0.00",
        },
      ]),
      "en"
    );

    expect(findHighestRevenuePeriod(rows, "SAR")?.valueLabel).toBe("80.00 SAR");
    expect(findHighestSettlementPeriod(rows)?.valueLabel).toBe("5");
    expect(findHighestComplimentaryPeriod(rows)?.valueLabel).toBe("3");
  });

  it("returns null insights when all values are zero", () => {
    const rows = buildSettlementTrendChartRows(
      trend([
        {
          periodKey: "2026-06-01",
          periodStart: "2026-06-01T00:00:00.000Z",
          paidCheckCount: 0,
          complimentaryCount: 0,
          voidedCount: 0,
          revenue: "0.00",
          taxCollected: "0.00",
        },
      ]),
      "en"
    );
    expect(findHighestRevenuePeriod(rows, "SAR")).toBeNull();
  });

  it("detects empty trend", () => {
    expect(isSettlementTrendEmpty(trend([]))).toBe(true);
  });
});

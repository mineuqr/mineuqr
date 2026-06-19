import { describe, expect, it } from "vitest";
import {
  buildSettlementTrendChartRows,
  findHighestComplimentaryPeriod,
  findHighestRevenuePeriod,
  findHighestSettlementPeriod,
  formatTrendPeriodLabel,
  isSettlementTrendEmpty,
  type SettlementTrendData,
} from "./settlementTrendDisplay";

const trend = (
  points: SettlementTrendData["points"],
  grouping: SettlementTrendData["grouping"] = "day"
): SettlementTrendData => ({
  generatedAt: "2026-06-18T22:00:00.000Z",
  grouping,
  points,
});

describe("settlementTrendDisplay SETTLEMENT-ARCHITECTURE-1B.4", () => {
  it("formats day, week, and month period labels", () => {
    expect(formatTrendPeriodLabel("2026-06-01", "day", "en")).toMatch(/Jun/);
    expect(formatTrendPeriodLabel("2026-06", "month", "en")).toMatch(/2026/);
    expect(formatTrendPeriodLabel("2026-W23", "week", "en")).toBe("W23 2026");
  });

  it("builds chart rows with complimentary rate", () => {
    const rows = buildSettlementTrendChartRows(
      trend([
        {
          periodKey: "2026-06-01",
          periodStart: "2026-06-01T00:00:00.000Z",
          paidSessionCount: 2,
          complimentarySessionCount: 1,
          paidRevenue: "60.00",
          complimentaryTotalAmount: "25.00",
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

  it("finds highest revenue, settlement, and complimentary periods", () => {
    const rows = buildSettlementTrendChartRows(
      trend([
        {
          periodKey: "2026-06-01",
          periodStart: "2026-06-01T00:00:00.000Z",
          paidSessionCount: 1,
          complimentarySessionCount: 0,
          paidRevenue: "40.00",
          complimentaryTotalAmount: "0.00",
        },
        {
          periodKey: "2026-06-02",
          periodStart: "2026-06-02T00:00:00.000Z",
          paidSessionCount: 2,
          complimentarySessionCount: 3,
          paidRevenue: "80.00",
          complimentaryTotalAmount: "30.00",
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
          paidSessionCount: 0,
          complimentarySessionCount: 0,
          paidRevenue: "0.00",
          complimentaryTotalAmount: "0.00",
        },
      ]),
      "en"
    );

    expect(findHighestRevenuePeriod(rows, "SAR")).toBeNull();
    expect(findHighestSettlementPeriod(rows)).toBeNull();
    expect(findHighestComplimentaryPeriod(rows)).toBeNull();
  });

  it("detects empty trend data", () => {
    expect(isSettlementTrendEmpty(trend([]))).toBe(true);
    expect(
      isSettlementTrendEmpty(
        trend([
          {
            periodKey: "2026-06-01",
            periodStart: "2026-06-01T00:00:00.000Z",
            paidSessionCount: 1,
            complimentarySessionCount: 0,
            paidRevenue: "10.00",
            complimentaryTotalAmount: "0.00",
          },
        ])
      )
    ).toBe(false);
  });
});

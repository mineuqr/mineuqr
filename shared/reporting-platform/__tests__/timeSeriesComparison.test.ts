import { describe, expect, it } from "vitest";
import {
  buildMetricComparison,
  computeGrowthPercent,
  resolveComparisonRange,
  resolveTrendDirection,
} from "../timeSeries";

describe("REPORTING-TIME-SERIES-ARCHITECTURE-1 — Comparison", () => {
  it("computes delta, growth %, and trend direction", () => {
    const cmp = buildMetricComparison({
      strategy: "previous_period",
      currentValue: "120.00",
      previousValue: "100.00",
      currentRange: { from: "a", to: "b" },
      previousRange: { from: "c", to: "d" },
      metricId: "revenue",
    });
    expect(cmp.delta).toBe("20.00");
    expect(cmp.growthPercent).toBe("20.00");
    expect(cmp.trendDirection).toBe("up");
  });

  it("marks undefined growth when previous is zero and current is not", () => {
    expect(computeGrowthPercent(10, 0)).toBeNull();
    const cmp = buildMetricComparison({
      strategy: "previous_year",
      currentValue: "10.00",
      previousValue: "0.00",
      currentRange: { from: null, to: null },
      previousRange: { from: null, to: null },
    });
    expect(cmp.growthPercent).toBeNull();
    expect(cmp.trendDirection).toBe("up");
  });

  it("resolves flat direction near zero delta", () => {
    expect(resolveTrendDirection(0)).toBe("flat");
    expect(resolveTrendDirection(0.001)).toBe("flat");
    expect(resolveTrendDirection(-1)).toBe("down");
  });

  it("resolves previous month baseline on Gregorian calendar (Rev 2.0)", () => {
    const range = resolveComparisonRange({
      strategy: "previous_business_period",
      granularity: "month",
      year: 2026,
      month: 7,
    });
    // June Gregorian: wall 00:00 1 Jun Riyadh → 23:59:59 30 Jun Riyadh
    expect(range.from).toBe("2026-05-31 21:00:00");
    expect(range.to).toBe("2026-06-30 20:59:59");
  });

  it("resolves previous year baseline for a month on Gregorian calendar", () => {
    const range = resolveComparisonRange({
      strategy: "previous_year",
      granularity: "month",
      year: 2026,
      month: 7,
    });
    expect(range.from).toBe("2025-06-30 21:00:00");
    expect(range.to).toBe("2025-07-31 20:59:59");
  });
});

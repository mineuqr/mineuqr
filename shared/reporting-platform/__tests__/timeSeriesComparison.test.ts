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

  it("resolves previous month baseline on Business Day (default 09:00 open)", () => {
    const range = resolveComparisonRange({
      strategy: "previous_business_period",
      granularity: "month",
      year: 2026,
      month: 7,
    });
    // June BD: open 1 Jun 09:00 Riyadh → close exclusive 1 Jul 09:00
    expect(range.from).toBe("2026-06-01 06:00:00");
    expect(range.to).toBe("2026-07-01 05:59:59");
  });

  it("resolves previous year baseline for a month on Business Day", () => {
    const range = resolveComparisonRange({
      strategy: "previous_year",
      granularity: "month",
      year: 2026,
      month: 7,
    });
    expect(range.from).toBe("2025-07-01 06:00:00");
    expect(range.to).toBe("2025-08-01 05:59:59");
  });
});

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TIME_SERIES_GRANULARITIES,
  TIME_SERIES_PROGRAM_ID,
} from "../timeSeries";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listFiles(dirRel: string): string[] {
  const abs = join(repoRoot, dirRel);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const rel = `${dirRel}/${name}`.replace(/\\/g, "/");
    const full = join(repoRoot, rel);
    if (statSync(full).isDirectory()) {
      out.push(...listFiles(rel));
      continue;
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("REPORTING-TIME-SERIES-ARCHITECTURE-1 architecture guards", () => {
  it("registers the program and six granularities", () => {
    expect(TIME_SERIES_PROGRAM_ID).toBe(
      "REPORTING-TIME-SERIES-ARCHITECTURE-1"
    );
    expect(TIME_SERIES_GRANULARITIES).toHaveLength(6);
  });

  it("Check trend aggregator owns Business Calendar — not settlementMetrics period keys", () => {
    const agg = read("server/reporting-platform/businessMetricsAggregator.ts");
    expect(agg).toContain("resolveBusinessPeriodKey");
    expect(agg).toContain("resolveBusinessPeriodStart");
    expect(agg).not.toContain('from "../analytics/settlementMetrics"');
    expect(agg).not.toContain("resolvePeriodKey(");
  });

  it("Order Sales summary selects today/month via Business Calendar", () => {
    const svc = read("server/reporting-platform/OrderSalesMetricsService.ts");
    expect(svc).toContain("businessTodayKey");
    expect(svc).toContain("businessCurrentYearMonth");
    expect(svc).not.toContain("utcDayKey");
    expect(svc).not.toContain("getUTCFullYear");
  });

  it("export periodRange delegates to Reporting Platform calendar", () => {
    const range = read("client/src/lib/reporting-exports/periodRange.ts");
    expect(range).toContain("businessCalendarMonthReportingBounds");
    expect(range).toContain("businessCalendarYearReportingBounds");
    expect(range).not.toContain("Date.UTC");
  });

  it("exposes comparison APIs on reporting router", () => {
    const router = read("server/reporting-platform/reportingRouter.ts");
    expect(router).toContain("compareMetricValues");
    expect(router).toContain("getComparisonBaselineRange");
  });

  it("presentation reporting-exports must not invent period keys or growth math", () => {
    for (const file of listFiles("client/src/lib/reporting-exports")) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toContain("resolvePeriodKey");
      expect(src, file).not.toContain("resolveBusinessPeriodKey");
      expect(src, file).not.toContain("formatIsoWeekKey");
      expect(src, file).not.toMatch(/growthPercent\s*=/);
      expect(src, file).not.toMatch(/computeGrowthPercent/);
      expect(src, file).not.toMatch(/resolveTrendDirection/);
    }
  });

  it("Dashboard trend consumers call reporting.getBusinessMetricsTrend only", () => {
    const trends = read(
      "client/src/components/dashboard/SettlementTrendsSection.tsx"
    );
    expect(trends).toContain("getBusinessMetricsTrend");
    expect(trends).not.toContain("getSettlementTrend");
    expect(trends).not.toContain("ops.getSettlement");
  });

  it("shared time-series package has no presentation imports", () => {
    const index = read("shared/reporting-platform/timeSeries/index.ts");
    expect(index).toContain("resolveBusinessPeriodKey");
    expect(index).toContain("buildMetricComparison");
    expect(index).not.toMatch(/Dashboard|react|trpc/);
  });
});

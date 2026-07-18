import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-BUSINESS-DAY-ADOPTION-1 architecture guards", () => {
  it("Revenue formula unchanged", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.formula).toContain("grandTotal");
    expect(revenue.calculationVersion).toBe(1);
  });

  it("Sessions today uses Business Day bounds — not naive 00:00–23:59", () => {
    const sessions = read(
      "client/src/components/dashboard/SessionsWorkspacePanel.tsx"
    );
    expect(sessions).toContain("businessDayTodayReportingBounds");
    expect(sessions).not.toContain("00:00:00");
    expect(sessions).not.toContain("23:59:59");
    expect(sessions).not.toContain("todayYmd");
  });

  it("ReportsTab defaults month via businessCurrentYearMonth — not getUTC*", () => {
    const reports = read("client/src/components/dashboard/ReportsTab.tsx");
    expect(reports).toContain("businessCurrentYearMonth");
    expect(reports).not.toContain("getUTCFullYear");
    expect(reports).not.toContain("getUTCMonth");
    expect(reports).toContain("workingHoursRaw");
  });

  it("Order Read dayKey uses resolveBusinessDayKey — not UTC slice", () => {
    const status = read(
      "server/order/read/projections/materializers/projectionStatus.ts"
    );
    expect(status).toContain("resolveBusinessDayKey");
    expect(status).not.toContain("slice(0, 10)");
  });

  it("calendar period keys use Business Day utilities", () => {
    const cal = read("shared/reporting-platform/timeSeries/calendar.ts");
    expect(cal).toContain("resolveBusinessDayKey");
    expect(cal).toContain("resolveBusinessDayWindow");
    expect(cal).toContain("REPORTING-BUSINESS-DAY-ADOPTION-1");
  });

  it("hours loader reuses Business Identity resolver", () => {
    const adapter = read(
      "server/reporting-platform/restaurantWorkingHoursAdapter.ts"
    );
    expect(adapter).toContain("restaurantOpeningTimeResolver");
  });
});

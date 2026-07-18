import { describe, expect, it } from "vitest";
import {
  businessCalendarMonthReportingBounds,
  businessCalendarYearReportingBounds,
  businessTodayKey,
  businessWallPartsFromInstant,
  formatIsoWeekKeyFromYmd,
  reportingWorkingHours,
  resolveBusinessPeriodKey,
  resolveBusinessPeriodStart,
  TIME_SERIES_GRANULARITIES,
} from "../timeSeries";

/** Default normalized hours → 09:00 open (closed days still use 09:00 for BD math). */
const defaultHours = reportingWorkingHours(null);

describe("REPORTING-BUSINESS-DAY-ADOPTION-1 — Business Day period keys", () => {
  it("exposes the six canonical granularities", () => {
    expect([...TIME_SERIES_GRANULARITIES]).toEqual([
      "hour",
      "day",
      "week",
      "month",
      "quarter",
      "year",
    ]);
  });

  it("buckets midday UTC onto Business Day after opening (default 09:00)", () => {
    // 12:00 UTC = 15:00 Riyadh → after 09:00 → 2026-07-16
    expect(
      resolveBusinessPeriodKey(
        "2026-07-16 12:00:00",
        "day",
        undefined,
        defaultHours
      )
    ).toBe("2026-07-16");
    expect(
      resolveBusinessPeriodKey(
        "2026-07-16 12:00:00",
        "month",
        undefined,
        defaultHours
      )
    ).toBe("2026-07");
  });

  it("assigns pre-opening wall time to previous Business Day", () => {
    // 22:00 UTC 15th = 01:00 Riyadh 16th → before 09:00 → BD 2026-07-15
    expect(
      resolveBusinessPeriodKey(
        "2026-07-15 22:00:00",
        "day",
        undefined,
        defaultHours
      )
    ).toBe("2026-07-15");
  });

  it("resolves ISO week from Business Day label", () => {
    expect(formatIsoWeekKeyFromYmd("2026-06-01")).toBe("2026-W23");
  });

  it("resolves periodStart at Business Day opening (not wall midnight)", () => {
    expect(
      resolveBusinessPeriodStart(
        "2026-07-16",
        "day",
        undefined,
        defaultHours
      )
    ).toBe("2026-07-16T06:00:00.000Z");
  });

  it("builds month/year reporting bounds from opening → next opening", () => {
    // Feb 2026: first open 09:00 Riyadh 1 Feb → 06:00Z; last BD ends at Mar 1 09:00 → inclusive 05:59:59Z
    expect(businessCalendarMonthReportingBounds(2026, 2, undefined, defaultHours)).toEqual({
      from: "2026-02-01 06:00:00",
      to: "2026-03-01 05:59:59",
    });
    expect(businessCalendarYearReportingBounds(2026, undefined, defaultHours)).toEqual({
      from: "2026-01-01 06:00:00",
      to: "2027-01-01 05:59:59",
    });
  });

  it("businessTodayKey (wall) still matches APP_TIMEZONE YMD for chrome", () => {
    const now = new Date("2026-07-15T22:30:00.000Z");
    expect(businessTodayKey(now)).toBe("2026-07-16");
    const wall = businessWallPartsFromInstant(now);
    expect(wall.ymd).toBe("2026-07-16");
  });
});

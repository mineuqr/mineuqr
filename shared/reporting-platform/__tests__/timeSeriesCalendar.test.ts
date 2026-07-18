import { describe, expect, it } from "vitest";
import {
  businessCalendarMonthReportingBounds,
  businessCalendarYearReportingBounds,
  businessTodayKey,
  businessWallPartsFromInstant,
  formatIsoWeekKeyFromYmd,
  resolveBusinessPeriodKey,
  resolveBusinessPeriodStart,
  TIME_SERIES_GRANULARITIES,
} from "../timeSeries";

describe("REPORTING-TIME-SERIES-ARCHITECTURE-1 — Business Calendar", () => {
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

  it("buckets midday UTC instants onto the same business calendar day", () => {
    expect(resolveBusinessPeriodKey("2026-07-16 12:00:00", "day")).toBe(
      "2026-07-16"
    );
    expect(resolveBusinessPeriodKey("2026-07-16 12:00:00", "month")).toBe(
      "2026-07"
    );
    expect(resolveBusinessPeriodKey("2026-07-16 12:00:00", "quarter")).toBe(
      "2026-Q3"
    );
    expect(resolveBusinessPeriodKey("2026-07-16 12:00:00", "year")).toBe(
      "2026"
    );
    expect(resolveBusinessPeriodKey("2026-07-16 12:00:00", "hour")).toBe(
      "2026-07-16T15"
    );
  });

  it("shifts late UTC evening into the next business calendar day (Riyadh)", () => {
    // 22:00 UTC = 01:00 next day Asia/Riyadh
    expect(resolveBusinessPeriodKey("2026-07-15 22:00:00", "day")).toBe(
      "2026-07-16"
    );
  });

  it("resolves ISO week from business wall YMD", () => {
    expect(formatIsoWeekKeyFromYmd("2026-06-01")).toBe("2026-W23");
    expect(resolveBusinessPeriodKey("2026-06-01 10:00:00", "week")).toBe(
      "2026-W23"
    );
  });

  it("resolves periodStart as UTC ISO at business wall midnight", () => {
    expect(resolveBusinessPeriodStart("2026-07-16", "day")).toBe(
      "2026-07-15T21:00:00.000Z"
    );
    expect(resolveBusinessPeriodStart("2026-07", "month")).toBe(
      "2026-06-30T21:00:00.000Z"
    );
  });

  it("builds month/year reporting bounds in stored UTC datetime form", () => {
    expect(businessCalendarMonthReportingBounds(2026, 2)).toEqual({
      from: "2026-01-31 21:00:00",
      to: "2026-02-28 20:59:59",
    });
    expect(businessCalendarYearReportingBounds(2026)).toEqual({
      from: "2025-12-31 21:00:00",
      to: "2026-12-31 20:59:59",
    });
  });

  it("businessTodayKey matches wall YMD in APP_TIMEZONE", () => {
    const now = new Date("2026-07-15T22:30:00.000Z");
    expect(businessTodayKey(now)).toBe("2026-07-16");
    const wall = businessWallPartsFromInstant(now);
    expect(wall.ymd).toBe("2026-07-16");
  });
});

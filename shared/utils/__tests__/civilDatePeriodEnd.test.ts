/**
 * CIVIL-DATE-PERIOD-END-INSTANT-HARDENING-1 — helper contract tests.
 * Evidence: unit / in-memory. Host-TZ independence is proven by pure wall→UTC math
 * (no process.env.TZ reliance — Windows Node often ignores TZ).
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  APP_TIMEZONE,
  InvalidCivilDateError,
  addCivilCalendarDays,
  addCivilCalendarMonths,
  civilDateToPeriodEndInstant,
  formatInRestaurantTimezone,
  parseCivilDateYmd,
  periodEndInstantAfterCivilOffset,
  restaurantLocalWallToUtcIso,
  todayYmd,
} from "../timezone";

describe("civilDateToPeriodEndInstant", () => {
  afterEach(() => {
    // no process mutation
  });

  it("converts ordinary Riyadh civil date to exclusive next-midnight UTC", () => {
    // 2026-08-30 Asia/Riyadh ends at 2026-08-31 00:00 Riyadh = 2026-08-30T21:00:00.000Z
    expect(civilDateToPeriodEndInstant("2026-08-30", APP_TIMEZONE).toISOString()).toBe(
      "2026-08-30T21:00:00.000Z"
    );
  });

  it("handles month end and year end", () => {
    expect(civilDateToPeriodEndInstant("2026-01-31", APP_TIMEZONE).toISOString()).toBe(
      "2026-01-31T21:00:00.000Z"
    );
    expect(civilDateToPeriodEndInstant("2026-12-31", APP_TIMEZONE).toISOString()).toBe(
      "2026-12-31T21:00:00.000Z"
    );
  });

  it("handles leap day and non-leap Feb 28", () => {
    expect(civilDateToPeriodEndInstant("2024-02-29", APP_TIMEZONE).toISOString()).toBe(
      "2024-02-29T21:00:00.000Z"
    );
    expect(civilDateToPeriodEndInstant("2026-02-28", APP_TIMEZONE).toISOString()).toBe(
      "2026-02-28T21:00:00.000Z"
    );
  });

  it("round-trips civil date through period-end rendering (last included local day)", () => {
    const end = civilDateToPeriodEndInstant("2026-08-30", APP_TIMEZONE);
    // One ms before exclusive end is still 2026-08-30 in Riyadh
    const included = new Date(end.getTime() - 1);
    expect(todayYmd(included, APP_TIMEZONE)).toBe("2026-08-30");
    expect(todayYmd(end, APP_TIMEZONE)).toBe("2026-08-31");
    expect(
      formatInRestaurantTimezone(included, "en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    ).toBe("2026-08-30");
  });

  it("is host-TZ independent for the same civil date + business timezone", () => {
    const a = civilDateToPeriodEndInstant("2026-06-15", APP_TIMEZONE).toISOString();
    const b = civilDateToPeriodEndInstant("2026-06-15", "Asia/Riyadh").toISOString();
    const wall = restaurantLocalWallToUtcIso("2026-06-16T00:00:00", "Asia/Riyadh");
    expect(a).toBe(b);
    expect(a).toBe(wall);
    // Explicit alternate zone differs — proves timezone argument is honored
    const nyc = civilDateToPeriodEndInstant("2026-06-15", "America/New_York").toISOString();
    expect(nyc).toBe("2026-06-16T04:00:00.000Z");
    expect(nyc).not.toBe(a);
  });

  it("rejects invalid civil dates without silent rollover", () => {
    expect(() => parseCivilDateYmd("2026-02-30")).toThrow(InvalidCivilDateError);
    expect(() => parseCivilDateYmd("2026-13-01")).toThrow(InvalidCivilDateError);
    expect(() => parseCivilDateYmd("")).toThrow(InvalidCivilDateError);
    expect(() => parseCivilDateYmd("2026/08/30")).toThrow(InvalidCivilDateError);
    expect(() => civilDateToPeriodEndInstant("2026-02-30", APP_TIMEZONE)).toThrow(
      InvalidCivilDateError
    );
  });
});

describe("civil calendar arithmetic", () => {
  it("adds days across month boundaries", () => {
    expect(addCivilCalendarDays("2026-01-28", 5)).toBe("2026-02-02");
  });

  it("adds months with JS setMonth overflow semantics", () => {
    expect(addCivilCalendarMonths("2026-01-31", 1)).toBe("2026-03-03");
    expect(addCivilCalendarMonths("2026-01-15", 1)).toBe("2026-02-15");
  });

  it("builds trial/renewal period ends from civil offsets", () => {
    const from = new Date("2026-08-30T10:00:00.000Z"); // 13:00 Riyadh → civil 2026-08-30
    const trial = periodEndInstantAfterCivilOffset({
      from,
      timeZone: APP_TIMEZONE,
      days: 14,
    });
    // 2026-08-30 + 14 = 2026-09-13 → exclusive end 2026-09-14 00:00 Riyadh
    expect(trial.toISOString()).toBe("2026-09-13T21:00:00.000Z");

    const monthly = periodEndInstantAfterCivilOffset({
      from,
      timeZone: APP_TIMEZONE,
      months: 1,
    });
    expect(monthly.toISOString()).toBe("2026-09-30T21:00:00.000Z");
  });
});

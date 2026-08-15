import { describe, expect, it } from "vitest";
import {
  addUtcCalendarMonths,
  computeConcessionEndsAt,
  isConcessionCurrent,
  validateConcessionDuration,
} from "../calendar";

describe("concession calendar", () => {
  it("uses exact elapsed UTC days", () => {
    const start = new Date("2026-08-15T18:00:00.000Z");
    expect(computeConcessionEndsAt(start, "day", 7).toISOString()).toBe(
      "2026-08-22T18:00:00.000Z"
    );
    expect(computeConcessionEndsAt(start, "day", 30).toISOString()).toBe(
      "2026-09-14T18:00:00.000Z"
    );
  });

  it("uses calendar months, not 30-day blocks", () => {
    const start = new Date("2026-08-15T12:00:00.000Z");
    expect(computeConcessionEndsAt(start, "month", 2).toISOString()).toBe(
      "2026-10-15T12:00:00.000Z"
    );
    expect(addUtcCalendarMonths(start, 1).toISOString()).not.toBe(
      new Date(start.getTime() + 30 * 86_400_000).toISOString()
    );
  });

  it("clamps Jan 31 + 1 month to Feb 28 in a common year", () => {
    const start = new Date("2026-01-31T15:00:00.000Z");
    expect(addUtcCalendarMonths(start, 1).toISOString()).toBe(
      "2026-02-28T15:00:00.000Z"
    );
  });

  it("clamps Jan 31 + 1 month to Feb 29 in a leap year", () => {
    const start = new Date("2024-01-31T15:00:00.000Z");
    expect(addUtcCalendarMonths(start, 1).toISOString()).toBe(
      "2024-02-29T15:00:00.000Z"
    );
  });

  it("rejects zero, negative, and invalid durations", () => {
    expect(validateConcessionDuration("day", 0)).toEqual({ ok: false, reason: "zero" });
    expect(validateConcessionDuration("month", -2)).toEqual({
      ok: false,
      reason: "negative",
    });
    expect(validateConcessionDuration("day", 1.5)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(validateConcessionDuration("day", 400)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(validateConcessionDuration("month", 1)).toEqual({ ok: true });
  });

  it("treats active rows as expired after endsAt without a job", () => {
    const ends = "2026-08-15T12:00:00.000Z";
    expect(isConcessionCurrent("active", ends, new Date("2026-08-15T11:59:59.000Z"))).toBe(
      true
    );
    expect(isConcessionCurrent("active", ends, new Date("2026-08-15T12:00:00.000Z"))).toBe(
      false
    );
    expect(isConcessionCurrent("cancelled", ends, new Date("2026-08-15T11:00:00.000Z"))).toBe(
      false
    );
  });
});

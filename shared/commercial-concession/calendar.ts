/**
 * COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1
 * Day = exact elapsed UTC days. Month = civil UTC calendar month (not 30-day blocks).
 */

export const CONCESSION_UNITS = ["day", "month"] as const;
export type ConcessionUnit = (typeof CONCESSION_UNITS)[number];

export const CONCESSION_DAY_MIN = 1;
export const CONCESSION_DAY_MAX = 366;
export const CONCESSION_MONTH_MIN = 1;
export const CONCESSION_MONTH_MAX = 24;

export function isConcessionUnit(value: string): value is ConcessionUnit {
  return value === "day" || value === "month";
}

export function addUtcCalendarMonths(start: Date, months: number): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();
  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(day, lastDay),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds()
    )
  );
}

export function computeConcessionEndsAt(
  startsAt: Date,
  unit: ConcessionUnit,
  duration: number
): Date {
  if (unit === "day") {
    return new Date(startsAt.getTime() + duration * 86_400_000);
  }
  return addUtcCalendarMonths(startsAt, duration);
}

export function validateConcessionDuration(
  unit: ConcessionUnit,
  duration: number
): { ok: true } | { ok: false; reason: "zero" | "negative" | "invalid" } {
  if (!Number.isInteger(duration)) return { ok: false, reason: "invalid" };
  if (duration === 0) return { ok: false, reason: "zero" };
  if (duration < 0) return { ok: false, reason: "negative" };
  if (unit === "day" && (duration < CONCESSION_DAY_MIN || duration > CONCESSION_DAY_MAX)) {
    return { ok: false, reason: "invalid" };
  }
  if (
    unit === "month" &&
    (duration < CONCESSION_MONTH_MIN || duration > CONCESSION_MONTH_MAX)
  ) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}

export function isConcessionCurrent(
  status: string,
  endsAt: Date | string,
  now: Date = new Date()
): boolean {
  if (status !== "active") return false;
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  if (Number.isNaN(end.getTime())) return false;
  return now < end;
}

/**
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — timezone / period-key primitives.
 * REPORTING-BUSINESS-DAY-ADOPTION-1 — day keys and filter bounds use Business Day
 * (opening → next opening) via shared/utils/businessDay.ts.
 *
 * Never aggregate with server local time, browser local time, or UTC calendar
 * for business reporting period keys.
 */

import type { TimeSeriesGranularity } from "./granularity";
import type { TimeRange } from "./types";
import type { NormalizedWorkingHours } from "../../utils/businessDay";
import {
  resolveBusinessDayKey,
  resolveBusinessDayWindow,
  resolveNormalizedOpeningHours,
} from "../../utils/businessDay";
import {
  APP_TIMEZONE,
  parseStoredUtcInstant,
  todayYmd,
  restaurantYearMonth,
  businessYearMonthMonthsAgo,
} from "../../utils/timezone";

export const REPORTING_BUSINESS_TIMEZONE = APP_TIMEZONE;

/** Wall-calendar components in the business timezone. */
export type BusinessWallParts = Readonly<{
  ymd: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}>;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatStoredUtcDatetime(instant: Date): string {
  return instant.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Offset of `timeZone` at `date` (ms to add to UTC to get wall time).
 */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

/**
 * Convert a business wall datetime to a UTC instant.
 * Refined once for DST edges (APP_TIMEZONE currently has no DST).
 */
export function businessWallToUtcInstant(
  ymd: string,
  hour: number,
  minute: number,
  second: number,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE
): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utc, timeZone);
  utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offset);
  const offset2 = getTimeZoneOffsetMs(utc, timeZone);
  if (offset2 !== offset) {
    utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offset2);
  }
  return utc;
}

export function businessWallPartsFromInstant(
  instant: Date,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE
): BusinessWallParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);
  return {
    ymd: `${year}-${pad2(month)}-${pad2(day)}`,
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

/** ISO-8601 week key from a civil YMD (week-numbering year). */
export function formatIsoWeekKeyFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${target.getUTCFullYear()}-W${pad2(weekNo)}`;
}

export function parseReportingInstantMs(value: string): number {
  const instant = parseStoredUtcInstant(value);
  return instant ? instant.getTime() : Number.NaN;
}

/**
 * Canonical period key for a stored UTC instant at the given granularity.
 * Daily / weekly: Business Day opening-hours keys (REPORTING-BUSINESS-DAY-ADOPTION-1).
 * Monthly / quarterly / yearly: Gregorian wall calendar in the restaurant TZ
 * (REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — not Business Day windows).
 * Never server-local or browser-local calendar grouping.
 */
export function resolveBusinessPeriodKey(
  settledAt: string,
  granularity: TimeSeriesGranularity,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): string | null {
  const instant = parseStoredUtcInstant(settledAt);
  if (!instant) return null;

  const businessDay = resolveBusinessDayKey(
    instant,
    workingHours,
    timeZone
  );
  const wall = businessWallPartsFromInstant(instant, timeZone);

  switch (granularity) {
    case "hour": {
      // Hour of wall clock, labeled on the Business Day key
      return `${businessDay}T${pad2(wall.hour)}`;
    }
    case "day":
      return businessDay;
    case "week":
      return formatIsoWeekKeyFromYmd(businessDay);
    case "month":
      return `${wall.year}-${pad2(wall.month)}`;
    case "quarter": {
      const q = Math.floor((wall.month - 1) / 3) + 1;
      return `${wall.year}-Q${q}`;
    }
    case "year":
      return String(wall.year);
    default:
      return null;
  }
}

/**
 * Inclusive bucket start as UTC ISO instant for a period key.
 * Day keys use Business Day opening instant.
 */
export function resolveBusinessPeriodStart(
  periodKey: string,
  granularity: TimeSeriesGranularity,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): string {
  switch (granularity) {
    case "hour": {
      const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})$/.exec(periodKey);
      if (!match) return periodKey;
      const dayWindow = resolveBusinessDayWindow(
        match[1]!,
        workingHours,
        timeZone
      );
      // Hour buckets still start at wall hour; clamp to business-day open when needed
      const wallStart = businessWallToUtcInstant(
        match[1]!,
        Number(match[2]),
        0,
        0,
        timeZone
      ).toISOString();
      return wallStart < dayWindow.startIso ? dayWindow.startIso : wallStart;
    }
    case "day":
      return resolveBusinessDayWindow(periodKey, workingHours, timeZone)
        .startIso;
    case "week": {
      const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
      if (!match) return periodKey;
      const year = Number(match[1]);
      const week = Number(match[2]);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const jan4Day = jan4.getUTCDay() || 7;
      const weekOneMonday = new Date(jan4);
      weekOneMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
      const monday = new Date(weekOneMonday);
      monday.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7);
      const mondayYmd = monday.toISOString().slice(0, 10);
      return businessWallToUtcInstant(mondayYmd, 0, 0, 0, timeZone).toISOString();
    }
    case "month": {
      const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
      if (!match) return periodKey;
      return businessWallToUtcInstant(
        `${match[1]}-${match[2]}-01`,
        0,
        0,
        0,
        timeZone
      ).toISOString();
    }
    case "quarter": {
      const match = /^(\d{4})-Q([1-4])$/.exec(periodKey);
      if (!match) return periodKey;
      const startMonth = (Number(match[2]) - 1) * 3 + 1;
      return businessWallToUtcInstant(
        `${match[1]}-${pad2(startMonth)}-01`,
        0,
        0,
        0,
        timeZone
      ).toISOString();
    }
    case "year": {
      const match = /^(\d{4})$/.exec(periodKey);
      if (!match) return periodKey;
      return businessWallToUtcInstant(
        `${match[1]}-01-01`,
        0,
        0,
        0,
        timeZone
      ).toISOString();
    }
    default:
      return periodKey;
  }
}

/**
 * @deprecated Prefer reportingBusinessTodayKey(workingHours, now).
 * Wall YMD — kept for non-reporting callers; reporting must use Business Day.
 */
export function businessTodayKey(
  now: Date = new Date(),
  timeZone: string = REPORTING_BUSINESS_TIMEZONE
): string {
  return todayYmd(now, timeZone);
}

/** Current business calendar year/month. */
export function businessCurrentYearMonth(
  now: Date = new Date(),
  timeZone: string = REPORTING_BUSINESS_TIMEZONE
): { year: number; month: number } {
  return businessYearMonthMonthsAgo(0, now, timeZone);
}

function daysInGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Pure Gregorian calendar month bounds (wall 00:00:00 day 1 → 23:59:59 last day)
 * in the restaurant business timezone.
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — not Business Day windows.
 * `workingHours` retained for call-site compatibility; unused for month bounds.
 */
export function gregorianCalendarMonthReportingBounds(
  year: number,
  month: number,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE,
  _workingHours?: NormalizedWorkingHours
): TimeRange {
  const mm = pad2(month);
  const last = daysInGregorianMonth(year, month);
  const firstYmd = `${year}-${mm}-01`;
  const lastYmd = `${year}-${mm}-${pad2(last)}`;
  return {
    from: formatStoredUtcDatetime(
      businessWallToUtcInstant(firstYmd, 0, 0, 0, timeZone)
    ),
    to: formatStoredUtcDatetime(
      businessWallToUtcInstant(lastYmd, 23, 59, 59, timeZone)
    ),
  };
}

/**
 * Pure Gregorian calendar year bounds (Jan 1 00:00:00 → Dec 31 23:59:59)
 * in the restaurant business timezone.
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — not Business Day windows.
 */
export function gregorianCalendarYearReportingBounds(
  year: number,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE,
  _workingHours?: NormalizedWorkingHours
): TimeRange {
  return {
    from: formatStoredUtcDatetime(
      businessWallToUtcInstant(`${year}-01-01`, 0, 0, 0, timeZone)
    ),
    to: formatStoredUtcDatetime(
      businessWallToUtcInstant(`${year}-12-31`, 23, 59, 59, timeZone)
    ),
  };
}

/**
 * Month filter bounds — Gregorian calendar month (Rev 2.0).
 * Optional workingHours retained for API compatibility.
 */
export function businessCalendarMonthReportingBounds(
  year: number,
  month: number,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): TimeRange {
  return gregorianCalendarMonthReportingBounds(
    year,
    month,
    timeZone,
    workingHours
  );
}

export function businessCalendarYearReportingBounds(
  year: number,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE,
  workingHours: NormalizedWorkingHours = resolveNormalizedOpeningHours(null)
): TimeRange {
  return gregorianCalendarYearReportingBounds(year, timeZone, workingHours);
}

/** @deprecated Use businessDayReportingBoundsForDay — wall midnight helpers removed from filters. */
export function businessCalendarDayReportingBoundsWall(
  ymd: string,
  timeZone: string = REPORTING_BUSINESS_TIMEZONE
): TimeRange {
  const fromInstant = businessWallToUtcInstant(ymd, 0, 0, 0, timeZone);
  const toInstant = businessWallToUtcInstant(ymd, 23, 59, 59, timeZone);
  return {
    from: formatStoredUtcDatetime(fromInstant),
    to: formatStoredUtcDatetime(toInstant),
  };
}

/** Re-export for consumers that need year/month of an instant in business TZ. */
export { restaurantYearMonth };

/**
 * REPORTING-BUSINESS-DAY-ADOPTION-1
 *
 * Reporting period bounds and day keys from canonical Business Day utilities
 * (opening → next opening). No duplicated date math.
 */

import {
  resolveBusinessDayKey,
  resolveBusinessDayWindow,
  resolveNormalizedOpeningHours,
  type NormalizedWorkingHours,
} from "../../utils/businessDay";
import { APP_TIMEZONE } from "../../utils/timezone";
import type { TimeRange } from "./types";

export type { NormalizedWorkingHours };

const REPORTING_TZ = APP_TIMEZONE;

function formatStoredUtcDatetime(instant: Date): string {
  return instant.toISOString().slice(0, 19).replace("T", " ");
}

export function reportingWorkingHours(
  raw: unknown = null
): NormalizedWorkingHours {
  return resolveNormalizedOpeningHours(raw);
}

/** Convert exclusive ISO end to inclusive stored UTC datetime for lexicographic filters. */
export function exclusiveIsoEndToInclusiveStored(endIso: string): string {
  const ms = Date.parse(endIso);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid exclusive end: ${endIso}`);
  }
  return formatStoredUtcDatetime(new Date(ms - 1000));
}

export function isoStartToStored(startIso: string): string {
  const ms = Date.parse(startIso);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid start: ${startIso}`);
  }
  return formatStoredUtcDatetime(new Date(ms));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addCalendarDaysYmd(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Current Business Day key (opening-hours aware). */
export function reportingBusinessTodayKey(
  workingHours: NormalizedWorkingHours,
  now: Date = new Date(),
  timeZone: string = REPORTING_TZ
): string {
  return resolveBusinessDayKey(now, workingHours, timeZone);
}

/** Inclusive stored from/to for one Business Day. */
export function businessDayReportingBoundsForDay(
  businessDay: string,
  workingHours: NormalizedWorkingHours,
  timeZone: string = REPORTING_TZ
): TimeRange {
  const window = resolveBusinessDayWindow(businessDay, workingHours, timeZone);
  return {
    from: isoStartToStored(window.startIso),
    to: exclusiveIsoEndToInclusiveStored(window.endIso),
  };
}

/** Inclusive stored from/to for "today" Business Day. */
export function businessDayTodayReportingBounds(
  workingHours: NormalizedWorkingHours,
  now: Date = new Date(),
  timeZone: string = REPORTING_TZ
): TimeRange {
  const day = reportingBusinessTodayKey(workingHours, now, timeZone);
  return businessDayReportingBoundsForDay(day, workingHours, timeZone);
}

/**
 * @deprecated Legacy / internal — do not use for Production month reporting filters.
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0: month filters use
 * `gregorianCalendarMonthReportingBounds` (pure Gregorian wall month).
 * Retained for compatibility and non-reporting BD utilities only.
 *
 * Inclusive bounds covering every Business Day whose label falls in the
 * civil year-month (first day open → last day's exclusive next open).
 */
export function businessDayMonthReportingBounds(
  year: number,
  month: number,
  workingHours: NormalizedWorkingHours,
  timeZone: string = REPORTING_TZ
): TimeRange {
  const mm = pad2(month);
  const first = `${year}-${mm}-01`;
  const last = `${year}-${mm}-${pad2(daysInMonth(year, month))}`;
  const start = resolveBusinessDayWindow(first, workingHours, timeZone);
  const end = resolveBusinessDayWindow(last, workingHours, timeZone);
  return {
    from: isoStartToStored(start.startIso),
    to: exclusiveIsoEndToInclusiveStored(end.endIso),
  };
}

/**
 * @deprecated Legacy / internal — do not use for Production year reporting filters.
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0: year filters use
 * `gregorianCalendarYearReportingBounds` (pure Gregorian wall year).
 * Retained for compatibility only.
 */
export function businessDayYearReportingBounds(
  year: number,
  workingHours: NormalizedWorkingHours,
  timeZone: string = REPORTING_TZ
): TimeRange {
  const start = resolveBusinessDayWindow(
    `${year}-01-01`,
    workingHours,
    timeZone
  );
  const end = resolveBusinessDayWindow(`${year}-12-31`, workingHours, timeZone);
  return {
    from: isoStartToStored(start.startIso),
    to: exclusiveIsoEndToInclusiveStored(end.endIso),
  };
}

/** List Business Day labels (YYYY-MM-DD) from startDay through endDay inclusive. */
export function listBusinessDayKeysInclusive(
  startDay: string,
  endDay: string
): string[] {
  const out: string[] = [];
  let cur = startDay;
  while (cur <= endDay) {
    out.push(cur);
    cur = addCalendarDaysYmd(cur, 1);
  }
  return out;
}

export function businessDayKeysInMonth(year: number, month: number): string[] {
  const mm = pad2(month);
  const last = daysInMonth(year, month);
  return listBusinessDayKeysInclusive(
    `${year}-${mm}-01`,
    `${year}-${mm}-${pad2(last)}`
  );
}

/**
 * Reporting period bounds for reporting.* from/to.
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0:
 * - Daily filters remain Business Day (callers use businessDay* helpers).
 * - Monthly / yearly exports and dashboard filters use pure Gregorian calendar
 *   bounds in the restaurant business timezone (not Business Day windows).
 */

import {
  gregorianCalendarMonthReportingBounds,
  gregorianCalendarYearReportingBounds,
} from "@shared/reporting-platform";

export function monthReportingRange(
  year: number,
  month: number,
  _workingHoursRaw: unknown = null
): { from: string; to: string } {
  const range = gregorianCalendarMonthReportingBounds(year, month);
  return {
    from: range.from ?? `${year}-${String(month).padStart(2, "0")}-01 00:00:00`,
    to:
      range.to ??
      `${year}-${String(month).padStart(2, "0")}-${String(
        new Date(Date.UTC(year, month, 0)).getUTCDate()
      ).padStart(2, "0")} 23:59:59`,
  };
}

export function yearReportingRange(
  year: number,
  _workingHoursRaw: unknown = null
): { from: string; to: string } {
  const range = gregorianCalendarYearReportingBounds(year);
  return {
    from: range.from ?? `${year}-01-01 00:00:00`,
    to: range.to ?? `${year}-12-31 23:59:59`,
  };
}

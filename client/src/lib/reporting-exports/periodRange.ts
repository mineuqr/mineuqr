/**
 * Business Calendar period bounds for reporting.* from/to.
 * REPORTING-TIME-SERIES-ARCHITECTURE-1 — delegates to Reporting Platform calendar.
 */

import {
  businessCalendarMonthReportingBounds,
  businessCalendarYearReportingBounds,
} from "@shared/reporting-platform";

export function monthReportingRange(
  year: number,
  month: number
): { from: string; to: string } {
  const range = businessCalendarMonthReportingBounds(year, month);
  return {
    from: range.from ?? `${year}-${String(month).padStart(2, "0")}-01 00:00:00`,
    to: range.to ?? `${year}-${String(month).padStart(2, "0")}-28 23:59:59`,
  };
}

export function yearReportingRange(year: number): { from: string; to: string } {
  const range = businessCalendarYearReportingBounds(year);
  return {
    from: range.from ?? `${year}-01-01 00:00:00`,
    to: range.to ?? `${year}-12-31 23:59:59`,
  };
}

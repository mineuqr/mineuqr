/**
 * Business Day period bounds for reporting.* from/to.
 * REPORTING-BUSINESS-DAY-ADOPTION-1 — opening → next opening (not wall midnight).
 */

import {
  businessDayMonthReportingBounds,
  businessDayYearReportingBounds,
  reportingWorkingHours,
  type NormalizedWorkingHours,
} from "@shared/reporting-platform";

export function monthReportingRange(
  year: number,
  month: number,
  workingHoursRaw: unknown = null
): { from: string; to: string } {
  const hours: NormalizedWorkingHours = reportingWorkingHours(workingHoursRaw);
  const range = businessDayMonthReportingBounds(year, month, hours);
  return {
    from: range.from ?? `${year}-${String(month).padStart(2, "0")}-01 00:00:00`,
    to: range.to ?? `${year}-${String(month).padStart(2, "0")}-28 23:59:59`,
  };
}

export function yearReportingRange(
  year: number,
  workingHoursRaw: unknown = null
): { from: string; to: string } {
  const hours: NormalizedWorkingHours = reportingWorkingHours(workingHoursRaw);
  const range = businessDayYearReportingBounds(year, hours);
  return {
    from: range.from ?? `${year}-01-01 00:00:00`,
    to: range.to ?? `${year}-12-31 23:59:59`,
  };
}

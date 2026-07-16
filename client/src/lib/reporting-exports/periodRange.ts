/** Calendar period bounds for reporting.* from/to (UTC date keys). */

export function monthReportingRange(
  year: number,
  month: number
): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dd = String(lastDay).padStart(2, "0");
  return {
    from: `${year}-${mm}-01 00:00:00`,
    to: `${year}-${mm}-${dd} 23:59:59`,
  };
}

export function yearReportingRange(year: number): { from: string; to: string } {
  return {
    from: `${year}-01-01 00:00:00`,
    to: `${year}-12-31 23:59:59`,
  };
}

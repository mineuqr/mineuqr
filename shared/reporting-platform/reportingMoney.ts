/** Pure money helpers for Reporting Platform aggregations. */

export function parseReportingAmount(value: string | null | undefined): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

export function formatReportingAmount(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function averageReportingAmount(
  total: number,
  count: number
): string {
  if (!Number.isFinite(count) || count <= 0) return "0.00";
  return formatReportingAmount(total / count);
}

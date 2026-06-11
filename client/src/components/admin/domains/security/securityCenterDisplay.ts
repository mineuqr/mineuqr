/** ADMIN-SECURITY-CENTER PR-7 — display helpers for Security Center UI. */

export type SecurityHealthStatus = "healthy" | "warning" | "critical";

export function securityStatusBadgeClass(status: SecurityHealthStatus): string {
  switch (status) {
    case "healthy":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-300";
  }
}

export function formatAuditStatsRangeLabel(days: number): string {
  return `last_${days}_days`;
}

export function countAuditBuckets(
  buckets: Record<string, number> | undefined
): { key: string; count: number }[] {
  if (!buckets) return [];
  return Object.entries(buckets)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

export function hasCriticalSecurityWarnings(
  warnings: { severity: string }[] | undefined
): boolean {
  return (warnings ?? []).some((w) => w.severity === "critical");
}

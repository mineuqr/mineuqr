/** ADMIN-SECURITY-CENTER PR-7 + SEMANTIC-STATUS-BADGE-SYSTEM-1 — display helpers. */

import {
  mapSecurityHealthToBadgeTone,
  semanticBadgeToneClass,
} from "@/design-system/semantic-badge";

export type SecurityHealthStatus = "healthy" | "warning" | "critical";

export function securityStatusBadgeClass(status: SecurityHealthStatus): string {
  return semanticBadgeToneClass(mapSecurityHealthToBadgeTone(status), "soft");
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

/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Operational health status — maps to Semantic Status Badge System only.
 * Presentation SSOT; no page-specific status colors.
 */

import {
  mapHealthToneToBadgeTone,
  type SemanticBadgeTone,
} from "@/design-system/semantic-badge";

export const PLATFORM_OPS_HEALTH_STATUSES = [
  "healthy",
  "warning",
  "degraded",
  "unavailable",
  "unknown",
] as const;

export type PlatformOpsHealthStatus =
  (typeof PLATFORM_OPS_HEALTH_STATUSES)[number];

export const PLATFORM_OPS_ALERT_SEVERITIES = [
  "info",
  "success",
  "warning",
  "critical",
] as const;

export type PlatformOpsAlertSeverity =
  (typeof PLATFORM_OPS_ALERT_SEVERITIES)[number];

/** Map platform health → semantic badge tone (existing palette only). */
export function mapPlatformOpsHealthToBadgeTone(
  status: PlatformOpsHealthStatus | string
): SemanticBadgeTone {
  switch (status) {
    case "healthy":
      return mapHealthToneToBadgeTone("ok");
    case "warning":
      return mapHealthToneToBadgeTone("warn");
    case "degraded":
    case "unavailable":
      return mapHealthToneToBadgeTone("bad");
    case "unknown":
    default:
      return mapHealthToneToBadgeTone("muted");
  }
}

export function mapPlatformOpsAlertToBadgeTone(
  severity: PlatformOpsAlertSeverity | string
): SemanticBadgeTone {
  switch (severity) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "critical":
      return "danger";
    case "info":
    default:
      return "info";
  }
}

/** Normalize observability health strings into the shared enum. */
export function normalizePlatformOpsHealth(
  value: string | undefined | null
): PlatformOpsHealthStatus {
  const v = (value ?? "").toLowerCase();
  if (v === "healthy") return "healthy";
  if (v === "warning") return "warning";
  if (v === "degraded") return "degraded";
  if (v === "unavailable") return "unavailable";
  return "unknown";
}

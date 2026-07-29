/**
 * PLATFORM-P0-PRODUCTION-READINESS-1
 * Unified Platform Ops product-status semantics (presentation only).
 */

import type { PlatformOpsHealthStatus } from "@/design-system/platform-ops-ui";

/** Canonical product-status vocabulary for Platform Operations sections. */
export const PLATFORM_OPS_PRODUCT_STATUSES = [
  "live",
  "architecture",
  "reserved",
  "preview",
  "deprecated",
] as const;

export type PlatformOpsProductStatus =
  (typeof PLATFORM_OPS_PRODUCT_STATUSES)[number];

/** Only `live` means operationally usable telemetry / control surface. */
export function isPlatformOpsOperationallyLive(
  status: PlatformOpsProductStatus
): boolean {
  return status === "live";
}

export function platformOpsStatusLabelKey(
  status: PlatformOpsProductStatus
): string {
  switch (status) {
    case "live":
      return "admin.platformOps.status.live";
    case "architecture":
      return "admin.platformOps.status.architecture";
    case "reserved":
      return "admin.platformOps.status.reserved";
    case "preview":
      return "admin.platformOps.status.preview";
    case "deprecated":
      return "admin.platformOps.status.deprecated";
  }
}

/** Map product status → foundation badge health tone (no custom colors). */
export function platformOpsStatusBadgeTone(
  status: PlatformOpsProductStatus
): PlatformOpsHealthStatus {
  switch (status) {
    case "live":
      return "healthy";
    case "preview":
      return "warning";
    case "architecture":
      return "degraded";
    case "deprecated":
      return "unavailable";
    case "reserved":
    default:
      return "unknown";
  }
}

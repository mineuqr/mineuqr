/**
 * REBUILD-5F — readiness input ownership surface.
 * Health produces runtime probe signals; Launch Readiness consumes them.
 * Does not own deploymentReadiness or featureVisibility (Launch Readiness domain).
 */
import { getHealthReadinessInputAssets } from "@/lib/admin/domains/health";

export const HEALTH_READINESS_INPUT_MODULE_PATHS = getHealthReadinessInputAssets().map(
  (asset) => asset.ownerPath
);

/** Placeholder for future readiness input export panel. */
export function HealthReadinessInputsSection() {
  return null;
}

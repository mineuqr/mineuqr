import {
  AdminRoutePlaceholderSection,
  PlaceholderComingSoonIndicator,
} from "@/components/admin/sections";
import type { AdminRouteId } from "@/lib/admin/routes/adminRouteTypes";
import { UI_VISIBILITY_INVENTORY } from "@/lib/commercial/featureVisibility";
import { getLaunchReadinessReleaseGateAssets } from "@/lib/admin/domains/launch-readiness";

export const LAUNCH_RELEASE_GATE_MODULE_PATHS = getLaunchReadinessReleaseGateAssets().map(
  (asset) => asset.ownerPath
);

/** Feature visibility inventory — Launch Readiness owns launch gate tracking. */
export { UI_VISIBILITY_INVENTORY };

type LaunchReadinessPlaceholderSectionProps = {
  routeId: AdminRouteId;
};

/** Wraps existing placeholder section — host path unchanged. */
export function LaunchReadinessPlaceholderSection({
  routeId,
}: LaunchReadinessPlaceholderSectionProps) {
  return <AdminRoutePlaceholderSection routeId={routeId} />;
}

export { PlaceholderComingSoonIndicator };

/** Placeholder for future release gate scorecard UI. */
export function LaunchReadinessGateSection() {
  return null;
}

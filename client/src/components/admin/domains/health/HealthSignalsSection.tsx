/**
 * REBUILD-5F — monitoring signal ownership surface.
 * OPS_EVENT taxonomy and ops log stream; no Health Center UI in this phase.
 */
import { getHealthMonitoringAssets } from "@/lib/admin/domains/health";

export const HEALTH_MONITORING_MODULE_PATHS = getHealthMonitoringAssets().map(
  (asset) => asset.ownerPath
);

/** Placeholder for future Health Center monitoring panel. */
export function HealthSignalsSection() {
  return null;
}

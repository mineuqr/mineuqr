import type { RoleCapabilityDeclaration } from "../roles/runtimeRoleContract";
import type { RoleRuntimeHealth } from "../roles/runtimeRoleContract";
import type { OperationalScreenState } from "./operationalScreenStateContract";
import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";

/**
 * Health projection — consumes canonical screen state only.
 * Health no longer derives operational state independently.
 */
export function projectHealthFromScreenState(
  state: OperationalScreenState,
  role: OperationalDeviceRole,
  capabilities: RoleCapabilityDeclaration,
  platform: {
    heartbeatCount: number;
    reconnectCount: number;
    appVersion: string;
    configurationVersion: string;
    appliedVersion: string | null;
  }
): RoleRuntimeHealth {
  return {
    runtimeState: state.runtimeState,
    role,
    version: platform.appVersion,
    configurationVersion: platform.configurationVersion,
    appliedVersion: platform.appliedVersion,
    configurationState: state.configurationState,
    configurationErrors: state.warnings
      .filter((w) => w.code.startsWith("configuration"))
      .map((w) => w.message),
    configurationUsedFallback: state.warnings.some((w) => w.code === "fallback_configuration"),
    categoryFilterEnabled: state.categoryFilterState !== "inactive",
    categoryFilterVersion: state.categoryFilterState === "inactive" ? null : state.version,
    displayDensity: state.displayDensity,
    displayDensityVersion: state.densityVersion,
    capabilities,
    operational: state.operationalState === "operational",
    blockedReason: state.blockedReason,
    heartbeatCount: platform.heartbeatCount,
    reconnectCount: platform.reconnectCount,
    screenStateVersion: state.version,
    operationalState: state.operationalState,
    connectivityState: state.connectivityState,
    businessReadiness: state.businessReadiness,
    maintenanceState: state.maintenanceState,
    warningCount: state.warnings.length,
    errorCount: state.errors.length,
  };
}

import type { OperationalScreenState } from "./operationalScreenStateContract";
import type { OperationalScreenRuntimeContext } from "../runtimeTypes";

/**
 * Diagnostics projection — consumes canonical screen state only.
 */
export function projectDiagnosticsFromScreenState(
  state: OperationalScreenState,
  context: OperationalScreenRuntimeContext,
  extras?: Record<string, unknown>
): Record<string, unknown> {
  return {
    screenState: state,
    operationalState: state.operationalState,
    connectivityState: state.connectivityState,
    businessReadiness: state.businessReadiness,
    maintenanceState: state.maintenanceState,
    warnings: state.warnings,
    errors: state.errors,
    identity: {
      deviceId: context.identity.deviceId,
      role: context.identity.role,
      displayName: context.identity.displayName,
    },
    configurationVersion: context.configurationVersion,
    lastAppliedVersion: context.lastAppliedVersion,
    ...extras,
  };
}

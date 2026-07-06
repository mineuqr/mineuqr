import type {
  OperationalScreenState,
  OperationalState,
} from "./operationalScreenStateContract";

/** Placeholder state before aggregator first publish. */
export function createInitialScreenState(): OperationalScreenState {
  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    runtimeState: "initializing",
    configurationState: "loading",
    densityState: "loading",
    displayDensity: null,
    densityVersion: null,
    categoryFilterState: "inactive",
    connectivityState: "connecting",
    operationalState: "initializing",
    businessReadiness: "unknown",
    maintenanceState: "normal",
    blockedReason: null,
    warnings: [],
    errors: [],
  };
}

export function createDisposedScreenState(): OperationalScreenState {
  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    runtimeState: "disposed",
    configurationState: "disposed",
    densityState: "disposed",
    displayDensity: null,
    densityVersion: null,
    categoryFilterState: "inactive",
    connectivityState: "offline",
    operationalState: "disposed",
    businessReadiness: "pairing_required",
    maintenanceState: "normal",
    blockedReason: null,
    warnings: [],
    errors: [],
  };
}

export function isTerminalOperationalState(state: OperationalState): boolean {
  return state === "disposed" || state === "disconnected";
}

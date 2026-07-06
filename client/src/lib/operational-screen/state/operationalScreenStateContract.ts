import type { ConfigurationLifecycleState } from "../configuration/runtimeConfigurationContract";
import type { DensityLifecycleState } from "../density/runtimeDisplayDensityContract";
import type { CanonicalDisplayDensity } from "../density/runtimeDisplayDensityContract";
import type { RoleRuntimeStatus } from "../roles/runtimeRoleContract";

/** Canonical connectivity state. */
export type ConnectivityState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "offline"
  | "unknown";

/** Canonical overall operational state. */
export type OperationalState =
  | "initializing"
  | "ready"
  | "operational"
  | "blocked"
  | "degraded"
  | "maintenance"
  | "disconnected"
  | "disposed";

export type BusinessReadiness =
  | "ready"
  | "configuration_required"
  | "pairing_required"
  | "role_unavailable"
  | "maintenance"
  | "unknown";

export type MaintenanceState = "normal" | "maintenance" | "read_only";

export type CategoryFilterState = "inactive" | "active" | "warning";

export type ScreenStateWarning = {
  code: string;
  message: string;
  severity: "low" | "medium";
};

export type ScreenStateError = {
  code: string;
  message: string;
};

/**
 * SCREEN-STATE-MODEL-1 — canonical operational screen state contract.
 * Single authority exposed to health, diagnostics, fleet, and presentation.
 */
export type OperationalScreenState = {
  version: number;
  updatedAt: string;
  runtimeState: RoleRuntimeStatus;
  configurationState: ConfigurationLifecycleState;
  densityState: DensityLifecycleState;
  displayDensity: CanonicalDisplayDensity | null;
  densityVersion: number | null;
  categoryFilterState: CategoryFilterState;
  connectivityState: ConnectivityState;
  operationalState: OperationalState;
  businessReadiness: BusinessReadiness;
  maintenanceState: MaintenanceState;
  blockedReason: { en: string; ar: string } | null;
  warnings: ScreenStateWarning[];
  errors: ScreenStateError[];
};

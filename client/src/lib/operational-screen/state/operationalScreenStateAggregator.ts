import type { RoleRuntimeStatus } from "../roles/runtimeRoleContract";
import type { ConfigurationHealth } from "../configuration/runtimeConfigurationContract";
import type { CategoryFilterHealth } from "../category-filter/runtimeCategoryFilterContract";
import type { DisplayDensityHealth } from "../density/runtimeDisplayDensityContract";
import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import type { BootstrapPhase } from "../runtimeTypes";
import type { CanonicalDisplayDensity } from "../density/runtimeDisplayDensityContract";
import type {
  BusinessReadiness,
  CategoryFilterState,
  ConnectivityState,
  MaintenanceState,
  OperationalScreenState,
  OperationalState,
  ScreenStateError,
  ScreenStateWarning,
} from "./operationalScreenStateContract";

export type StateAggregatorInput = {
  bootstrapPhase: BootstrapPhase;
  roleRuntimeState: RoleRuntimeStatus;
  roleOperational: boolean;
  roleBlockedReason: { en: string; ar: string } | null;
  runtimeConfiguration: RuntimeConfiguration;
  configurationHealth: ConfigurationHealth | null;
  densityState: string;
  displayDensity: CanonicalDisplayDensity | null;
  displayDensityHealth: DisplayDensityHealth | null;
  categoryFilterHealth: CategoryFilterHealth | null;
  reconnecting: boolean;
  degraded: boolean;
  lastError: string | null;
  deviceStatus: "active" | "disabled";
  hasActiveToken: boolean;
};

function resolveConnectivity(input: StateAggregatorInput): ConnectivityState {
  const { bootstrapPhase, reconnecting, degraded } = input;

  if (bootstrapPhase === "pairing_redirect" || bootstrapPhase === "revoked") {
    return "offline";
  }
  if (reconnecting) return "reconnecting";
  if (degraded || bootstrapPhase === "degraded") return "disconnected";
  if (
    bootstrapPhase === "loading" ||
    bootstrapPhase === "validating" ||
    bootstrapPhase === "context_ready"
  ) {
    return "connecting";
  }
  if (
    bootstrapPhase === "heartbeat_active" ||
    bootstrapPhase === "running" ||
    bootstrapPhase === "blocked"
  ) {
    return "connected";
  }
  return "unknown";
}

function resolveMaintenanceState(input: StateAggregatorInput): MaintenanceState {
  if (input.deviceStatus === "disabled") return "maintenance";
  return "normal";
}

function resolveCategoryFilterState(input: StateAggregatorInput): CategoryFilterState {
  const health = input.categoryFilterHealth;
  if (!health || !health.filterEnabled) return "inactive";
  if (health.validationStatus === "warning" || health.validationErrors.length > 0) {
    return "warning";
  }
  return "active";
}

function resolveBusinessReadiness(input: StateAggregatorInput): BusinessReadiness {
  const { bootstrapPhase, roleOperational, deviceStatus, hasActiveToken, runtimeConfiguration } =
    input;

  if (bootstrapPhase === "pairing_redirect" || bootstrapPhase === "revoked" || !hasActiveToken) {
    return "pairing_required";
  }
  if (deviceStatus === "disabled") return "maintenance";
  if (bootstrapPhase === "blocked" || (!roleOperational && bootstrapPhase === "running")) {
    return "role_unavailable";
  }
  if (
    runtimeConfiguration.configurationState === "invalid" ||
    runtimeConfiguration.usedFallback ||
    (input.configurationHealth?.versionMismatch ?? false)
  ) {
    return "configuration_required";
  }
  if (bootstrapPhase === "running") return "ready";
  return "unknown";
}

function collectWarnings(input: StateAggregatorInput): ScreenStateWarning[] {
  const warnings: ScreenStateWarning[] = [];

  for (const ignored of input.categoryFilterHealth?.ignoredCategories ?? []) {
    warnings.push({
      code: "unknown_category",
      message: `Unknown category id ignored: ${ignored}`,
      severity: "low",
    });
  }
  if (input.displayDensityHealth?.usedFallback) {
    warnings.push({
      code: "fallback_density",
      message: "Display density fell back to comfortable",
      severity: "low",
    });
  }
  if (input.configurationHealth?.usedFallback) {
    warnings.push({
      code: "fallback_configuration",
      message: "Configuration fell back to defaults",
      severity: "medium",
    });
  }
  if (input.configurationHealth?.versionMismatch) {
    warnings.push({
      code: "configuration_reload_pending",
      message: "Configuration version mismatch — reload pending",
      severity: "low",
    });
  }
  if (input.runtimeConfiguration.validationErrors.length > 0) {
    warnings.push({
      code: "configuration_validation",
      message: input.runtimeConfiguration.validationErrors.join(", "),
      severity: "medium",
    });
  }

  return warnings;
}

function collectErrors(input: StateAggregatorInput): ScreenStateError[] {
  const errors: ScreenStateError[] = [];
  if (input.lastError) {
    errors.push({ code: "runtime_error", message: input.lastError });
  }
  return errors;
}

/**
 * Resolve overall operational state using canonical precedence:
 * Disposed → Disconnected → Maintenance → Blocked → Degraded → Operational
 */
export function resolveOperationalState(
  input: StateAggregatorInput,
  connectivity: ConnectivityState,
  maintenance: MaintenanceState,
  warnings: ScreenStateWarning[]
): OperationalState {
  const { bootstrapPhase, roleOperational, degraded } = input;

  if (bootstrapPhase === "pairing_redirect" || bootstrapPhase === "revoked") {
    return "disposed";
  }

  if (connectivity === "disconnected" || connectivity === "offline") {
    return "disconnected";
  }

  if (maintenance === "maintenance") {
    return "maintenance";
  }

  if (bootstrapPhase === "blocked" || (bootstrapPhase === "running" && !roleOperational)) {
    return "blocked";
  }

  const configDegraded =
    input.runtimeConfiguration.configurationState === "invalid" ||
    input.runtimeConfiguration.usedFallback ||
    (input.configurationHealth?.versionMismatch ?? false);

  if (degraded || bootstrapPhase === "degraded" || configDegraded || warnings.some((w) => w.severity === "medium")) {
    return "degraded";
  }

  if (
    bootstrapPhase === "loading" ||
    bootstrapPhase === "validating" ||
    bootstrapPhase === "context_ready" ||
    bootstrapPhase === "heartbeat_active"
  ) {
    return "initializing";
  }

  if (bootstrapPhase === "running" && roleOperational) {
    return "operational";
  }

  if (bootstrapPhase === "running") {
    return "ready";
  }

  return "initializing";
}

/**
 * SCREEN-STATE-MODEL-1 — single operational screen state authority.
 */
export class OperationalScreenStateAggregator {
  private state: OperationalScreenState | null = null;
  private versionCounter = 0;

  aggregate(input: StateAggregatorInput): OperationalScreenState {
    const connectivityState = resolveConnectivity(input);
    const maintenanceState = resolveMaintenanceState(input);
    const categoryFilterState = resolveCategoryFilterState(input);
    const businessReadiness = resolveBusinessReadiness(input);
    const warnings = collectWarnings(input);
    const errors = collectErrors(input);
    const operationalState = resolveOperationalState(
      input,
      connectivityState,
      maintenanceState,
      warnings
    );

    this.versionCounter += 1;
    const next: OperationalScreenState = {
      version: this.versionCounter,
      updatedAt: new Date().toISOString(),
      runtimeState: input.roleRuntimeState,
      configurationState: input.runtimeConfiguration.configurationState,
      densityState: input.densityState as OperationalScreenState["densityState"],
      displayDensity: input.displayDensity,
      densityVersion: input.displayDensityHealth?.densityVersion ?? null,
      categoryFilterState,
      connectivityState,
      operationalState,
      businessReadiness,
      maintenanceState,
      blockedReason: input.roleOperational ? null : input.roleBlockedReason,
      warnings,
      errors,
    };

    this.state = next;
    return next;
  }

  getState(): OperationalScreenState | null {
    return this.state;
  }

  dispose(): void {
    this.state = null;
  }
}

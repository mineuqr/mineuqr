import type { OperationalDeviceRole } from "../../domain/deviceRoles";
import type { DevicePresence } from "../../domain/deviceHealth";
import type {
  FleetBusinessReadiness,
  FleetCanonicalState,
  FleetConnectivityState,
  FleetMaintenanceState,
  FleetOperationalState,
} from "./fleetReadModelContracts";

const OPERATIONAL_ROLES: OperationalDeviceRole[] = ["kitchen_display", "expo_display"];

function isOperationalRole(role: OperationalDeviceRole): boolean {
  return OPERATIONAL_ROLES.includes(role);
}

function resolveConnectivity(presence: DevicePresence): FleetConnectivityState {
  if (presence === "online") return "connected";
  if (presence === "offline") return "disconnected";
  return "unknown";
}

/**
 * Server-side canonical state projection for fleet management.
 * Aligns with SCREEN-STATE-MODEL-1 — cards never compute state.
 */
export function projectFleetCanonicalState(input: {
  status: "active" | "disabled";
  role: OperationalDeviceRole;
  presence: DevicePresence;
  hasActiveToken: boolean;
}): FleetCanonicalState {
  const connectivityState = resolveConnectivity(input.presence);
  const maintenanceState: FleetMaintenanceState =
    input.status === "disabled" ? "maintenance" : "normal";

  if (input.status === "disabled") {
    return {
      operationalState: "maintenance",
      connectivityState,
      businessReadiness: "maintenance",
      maintenanceState,
    };
  }

  if (!input.hasActiveToken) {
    return {
      operationalState: "degraded",
      connectivityState,
      businessReadiness: "pairing_required",
      maintenanceState,
    };
  }

  if (!isOperationalRole(input.role)) {
    return {
      operationalState: "blocked",
      connectivityState,
      businessReadiness: "role_unavailable",
      maintenanceState,
    };
  }

  if (input.presence === "offline") {
    return {
      operationalState: "disconnected",
      connectivityState: "disconnected",
      businessReadiness: "ready",
      maintenanceState,
    };
  }

  if (input.presence === "never_seen") {
    return {
      operationalState: "initializing",
      connectivityState: "unknown",
      businessReadiness: "unknown",
      maintenanceState,
    };
  }

  return {
    operationalState: "operational",
    connectivityState: "connected",
    businessReadiness: "ready",
    maintenanceState,
  };
}

export function fleetOperationalRank(state: FleetOperationalState): number {
  const ranks: Record<FleetOperationalState, number> = {
    disposed: 0,
    disconnected: 1,
    maintenance: 2,
    blocked: 3,
    degraded: 4,
    initializing: 5,
    ready: 6,
    operational: 7,
  };
  return ranks[state];
}

export function matchesCanonicalFilters(
  model: { canonicalState: FleetCanonicalState; businessReadiness: FleetBusinessReadiness },
  filters: {
    operationalState?: FleetOperationalState;
    businessReadiness?: FleetBusinessReadiness;
    connectivityState?: FleetConnectivityState;
  }
): boolean {
  if (
    filters.operationalState != null &&
    model.canonicalState.operationalState !== filters.operationalState
  ) {
    return false;
  }
  if (
    filters.businessReadiness != null &&
    model.businessReadiness !== filters.businessReadiness
  ) {
    return false;
  }
  if (
    filters.connectivityState != null &&
    model.canonicalState.connectivityState !== filters.connectivityState
  ) {
    return false;
  }
  return true;
}

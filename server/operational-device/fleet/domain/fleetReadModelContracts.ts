import type { OperationalDeviceRole } from "../../domain/deviceRoles";

export const FLEET_QUERY_CATALOG_VERSION = 1 as const;
export const DEFAULT_FLEET_PAGE_SIZE = 50 as const;
export const MAX_FLEET_PAGE_SIZE = 100 as const;

/** Mirrors SCREEN-STATE-MODEL-1 canonical enums for fleet consumption. */
export type FleetConnectivityState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "offline"
  | "unknown";

export type FleetOperationalState =
  | "initializing"
  | "ready"
  | "operational"
  | "blocked"
  | "degraded"
  | "maintenance"
  | "disconnected"
  | "disposed";

export type FleetBusinessReadiness =
  | "ready"
  | "configuration_required"
  | "pairing_required"
  | "role_unavailable"
  | "maintenance"
  | "unknown";

export type FleetMaintenanceState = "normal" | "maintenance" | "read_only";

export type FleetCanonicalState = {
  operationalState: FleetOperationalState;
  connectivityState: FleetConnectivityState;
  businessReadiness: FleetBusinessReadiness;
  maintenanceState: FleetMaintenanceState;
};

export type FleetHealthSummary = {
  presence: "online" | "offline" | "never_seen";
  operational: boolean;
  hasActiveToken: boolean;
  warningCount: number;
};

/**
 * SCREEN-FLEET-SCALE-1 — canonical fleet read model.
 * Presentation consumes this contract only — never raw device records.
 */
export type OperationalScreenFleetReadModel = {
  screenId: string;
  displayName: string;
  role: OperationalDeviceRole;
  branchId: number | null;
  /** Future-safe — null until zone management exists. */
  zoneId: number | null;
  canonicalState: FleetCanonicalState;
  businessReadiness: FleetBusinessReadiness;
  healthSummary: FleetHealthSummary;
  lastHeartbeat: string | null;
  reportedVersion: string | null;
  configurationVersion: string;
  tenantId: number;
  updatedAt: string;
  createdAt: string;
};

export type FleetCursor = {
  nextCursor: string | null;
  previousCursor: string | null;
  pageSize: number;
  hasMore: boolean;
};

export type FleetSortField =
  | "displayName"
  | "lastSeen"
  | "operationalState"
  | "role"
  | "created"
  | "updated"
  | "version";

export type FleetSortOrder = "asc" | "desc";

export type FleetGroupBy = "restaurant" | "branch" | "zone" | "role" | "none";

export type FleetScreenQuery = {
  restaurantId: number;
  search?: string;
  role?: OperationalDeviceRole;
  operationalState?: FleetOperationalState;
  businessReadiness?: FleetBusinessReadiness;
  connectivityState?: FleetConnectivityState;
  branchId?: number;
  zoneId?: number | null;
  configurationState?: "valid" | "invalid";
  sortBy?: FleetSortField;
  sortOrder?: FleetSortOrder;
  limit?: number;
  cursor?: string | null;
  groupBy?: FleetGroupBy;
};

export type FleetScreenGroup = {
  key: string;
  label: string;
  branchId: number | null;
  zoneId: number | null;
  role: OperationalDeviceRole | null;
  screens: OperationalScreenFleetReadModel[];
};

export type FleetQueryObservability = {
  queryDurationMs: number;
  cacheHit: boolean;
  resultCount: number;
  cursorCount: number;
};

export type FleetScreenQueryResult = {
  generatedAt: string;
  queryCatalogVersion: typeof FLEET_QUERY_CATALOG_VERSION;
  items: OperationalScreenFleetReadModel[];
  groups: FleetScreenGroup[] | null;
  cursor: FleetCursor;
  observability: FleetQueryObservability;
};

export type FleetKpiResult = {
  generatedAt: string;
  total: number;
  online: number;
  offline: number;
  disabled: number;
  operational: number;
  degraded: number;
};

export function clampFleetPageSize(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_FLEET_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_FLEET_PAGE_SIZE);
}

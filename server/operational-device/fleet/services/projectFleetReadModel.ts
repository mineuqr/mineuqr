import type { OperationalDeviceRecord } from "../../domain/deviceContracts";
import { deriveDevicePresence } from "../../domain/deviceHealth";
import { resolveScreenConfigVersion } from "../../domain/screenConfigVersion";
import type { OperationalScreenFleetReadModel } from "../domain/fleetReadModelContracts";
import { projectFleetCanonicalState } from "../domain/fleetCanonicalState";

export type FleetDeviceRow = OperationalDeviceRecord & {
  hasActiveToken: boolean;
};

export function projectFleetReadModel(
  row: FleetDeviceRow,
  now: number = Date.now()
): OperationalScreenFleetReadModel {
  const presence = deriveDevicePresence(row.lastSeenAt, now);
  const canonicalState = projectFleetCanonicalState({
    status: row.status,
    role: row.role,
    presence,
    hasActiveToken: row.hasActiveToken,
  });

  return {
    screenId: row.deviceId,
    displayName: row.displayName,
    role: row.role,
    branchId: row.branchId,
    zoneId: null,
    canonicalState,
    businessReadiness: canonicalState.businessReadiness,
    healthSummary: {
      presence,
      operational: canonicalState.operationalState === "operational",
      hasActiveToken: row.hasActiveToken,
      warningCount: 0,
    },
    lastHeartbeat: row.lastSeenAt,
    reportedVersion: row.reportedVersion,
    configurationVersion: resolveScreenConfigVersion(row),
    tenantId: row.restaurantId,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

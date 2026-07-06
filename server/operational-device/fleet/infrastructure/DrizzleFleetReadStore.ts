import { and, desc, asc, eq, like, or, lt, inArray, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { operationalDevices, operationalDeviceTokens } from "../../../../drizzle/schema";
import { DEVICE_OFFLINE_THRESHOLD_MS } from "../../domain/deviceRoles";
import { parseScreenConfig } from "../../domain/screenConfig";
import type { FleetDeviceRow } from "../services/projectFleetReadModel";
import type { FleetReadStore, FleetStoreQuery } from "./FleetReadStore";

function mapRow(
  row: typeof operationalDevices.$inferSelect,
  hasActiveToken: boolean
): FleetDeviceRow {
  return {
    deviceId: row.deviceId,
    restaurantId: row.restaurantId,
    branchId: row.branchId ?? null,
    role: row.role as FleetDeviceRow["role"],
    displayName: row.displayName,
    screenConfig: parseScreenConfig(row.screenConfig),
    status: row.status as FleetDeviceRow["status"],
    reportedVersion: row.reportedVersion ?? null,
    lastSeenAt: row.lastSeenAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasActiveToken,
  };
}

export class DrizzleFleetReadStore implements FleetReadStore {
  async fetchDeviceRows(query: FleetStoreQuery): Promise<FleetDeviceRow[]> {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(operationalDevices.restaurantId, query.restaurantId)];

    if (query.role) {
      conditions.push(eq(operationalDevices.role, query.role));
    }
    if (query.branchId != null) {
      conditions.push(eq(operationalDevices.branchId, query.branchId));
    }
    if (query.status) {
      conditions.push(eq(operationalDevices.status, query.status));
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          like(operationalDevices.displayName, term),
          like(operationalDevices.role, term),
          like(operationalDevices.reportedVersion, term)
        )!
      );
    }

    const sortBy = query.sortBy ?? "updated";
    const sortOrder = query.sortOrder ?? "desc";
    const orderColumn =
      sortBy === "displayName"
        ? operationalDevices.displayName
        : sortBy === "lastSeen"
          ? operationalDevices.lastSeenAt
          : sortBy === "role"
            ? operationalDevices.role
            : sortBy === "created"
              ? operationalDevices.createdAt
              : sortBy === "version"
                ? operationalDevices.reportedVersion
                : operationalDevices.updatedAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const rows = await db
      .select()
      .from(operationalDevices)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn), orderFn(operationalDevices.deviceId));

    const deviceIds = rows.map((r) => r.deviceId);
    const tokenMap = new Map<string, boolean>();

    if (deviceIds.length > 0) {
      const tokenRows = await db
        .select({
          deviceId: operationalDeviceTokens.deviceId,
        })
        .from(operationalDeviceTokens)
        .where(
          and(
            eq(operationalDeviceTokens.status, "active"),
            inArray(operationalDeviceTokens.deviceId, deviceIds)
          )
        );

      for (const token of tokenRows) {
        tokenMap.set(token.deviceId, true);
      }
    }

    return rows.map((row) => mapRow(row, tokenMap.get(row.deviceId) ?? false));
  }
}

/** SQL approximation for offline filter — used when connectivity filter is server-pushed. */
export function offlineThresholdIso(now: number = Date.now()): string {
  return new Date(now - DEVICE_OFFLINE_THRESHOLD_MS).toISOString();
}

export async function countOfflineDevices(restaurantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const threshold = offlineThresholdIso();
  const rows = await db
    .select({ deviceId: operationalDevices.deviceId })
    .from(operationalDevices)
    .where(
      and(
        eq(operationalDevices.restaurantId, restaurantId),
        eq(operationalDevices.status, "active"),
        or(isNull(operationalDevices.lastSeenAt), lt(operationalDevices.lastSeenAt, threshold))!
      )
    );
  return rows.length;
}

import type { OperationalDeviceStore } from "../../infrastructure/OperationalDeviceStore";
import { deriveDevicePresence } from "../../domain/deviceHealth";
import type { FleetDeviceRow } from "../services/projectFleetReadModel";
import type { FleetReadStore, FleetStoreQuery } from "./FleetReadStore";

function matchesSearch(row: FleetDeviceRow, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    row.displayName.toLowerCase().includes(term) ||
    row.role.toLowerCase().includes(term) ||
    (row.branchId != null && String(row.branchId).includes(term)) ||
    (row.reportedVersion?.toLowerCase().includes(term) ?? false)
  );
}

export class InMemoryFleetReadStore implements FleetReadStore {
  constructor(private readonly deviceStore: OperationalDeviceStore) {}

  async fetchDeviceRows(query: FleetStoreQuery): Promise<FleetDeviceRow[]> {
    const devices = await this.deviceStore.listDevicesByRestaurant(query.restaurantId);
    const rows: FleetDeviceRow[] = [];

    for (const device of devices) {
      const activeToken = await this.deviceStore.findActiveTokenForDevice(device.deviceId);
      rows.push({ ...device, hasActiveToken: activeToken != null });
    }

    return rows.filter((row) => {
      if (query.role != null && row.role !== query.role) return false;
      if (query.branchId != null && row.branchId !== query.branchId) return false;
      if (query.status != null && row.status !== query.status) return false;
      if (query.search && !matchesSearch(row, query.search)) return false;
      return true;
    });
  }
}

export function derivePresenceFilter(
  connectivityState: string | undefined
): "online" | "offline" | "never_seen" | undefined {
  if (connectivityState === "connected") return "online";
  if (connectivityState === "disconnected") return "offline";
  if (connectivityState === "unknown") return "never_seen";
  return undefined;
}

export function filterRowsByPresence(
  rows: FleetDeviceRow[],
  presence: "online" | "offline" | "never_seen",
  now: number = Date.now()
): FleetDeviceRow[] {
  return rows.filter((row) => deriveDevicePresence(row.lastSeenAt, now) === presence);
}

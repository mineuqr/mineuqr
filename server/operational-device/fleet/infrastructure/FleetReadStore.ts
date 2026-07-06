import type { FleetDeviceRow } from "../services/projectFleetReadModel";
import type { FleetScreenQuery } from "../domain/fleetReadModelContracts";

export type FleetStoreQuery = Pick<
  FleetScreenQuery,
  "restaurantId" | "search" | "role" | "branchId" | "sortBy" | "sortOrder"
> & {
  status?: "active" | "disabled";
};

export interface FleetReadStore {
  /** Fetch device rows with SQL-level filters — canonical filters applied by query engine. */
  fetchDeviceRows(query: FleetStoreQuery): Promise<FleetDeviceRow[]>;
}

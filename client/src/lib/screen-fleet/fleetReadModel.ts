import type { RouterOutputs } from "@/lib/trpc";

export type FleetScreenReadModel =
  RouterOutputs["operationalDevice"]["fleet"]["queryScreens"]["items"][number];

export type FleetQueryResult = RouterOutputs["operationalDevice"]["fleet"]["queryScreens"];

export type FleetKpiResult = RouterOutputs["operationalDevice"]["fleet"]["getKpis"];

export type FleetQueryInput = {
  restaurantId: number;
  search?: string;
  role?: FleetScreenReadModel["role"];
  operationalState?: FleetScreenReadModel["canonicalState"]["operationalState"];
  businessReadiness?: FleetScreenReadModel["businessReadiness"];
  connectivityState?: FleetScreenReadModel["canonicalState"]["connectivityState"];
  branchId?: number;
  sortBy?: "displayName" | "lastSeen" | "operationalState" | "role" | "created" | "updated" | "version";
  sortOrder?: "asc" | "desc";
  limit?: number;
  groupBy?: "restaurant" | "branch" | "zone" | "role" | "none";
};

export const DEFAULT_FLEET_PAGE_SIZE = 50;

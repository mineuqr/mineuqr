import { DrizzleFleetReadStore } from "./fleet/infrastructure/DrizzleFleetReadStore";
import { FleetQueryEngine } from "./fleet/services/FleetQueryEngine";

const fleetReadStore = new DrizzleFleetReadStore();

export const fleetComposition = {
  queryEngine: new FleetQueryEngine(fleetReadStore),
};

import { router } from "../_core/trpc";
import { operationalDeviceManagementRouter } from "./routers/operationalDeviceManagementRouter";
import { operationalDeviceRuntimeRouter } from "./routers/operationalDeviceRuntimeRouter";
import { fleetReadRouter } from "./fleet/routers/fleetReadRouter";

export const operationalDeviceRouter = router({
  management: operationalDeviceManagementRouter,
  runtime: operationalDeviceRuntimeRouter,
  fleet: fleetReadRouter,
});

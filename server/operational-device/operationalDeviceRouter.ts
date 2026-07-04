import { router } from "../_core/trpc";
import { operationalDeviceManagementRouter } from "./routers/operationalDeviceManagementRouter";
import { operationalDeviceRuntimeRouter } from "./routers/operationalDeviceRuntimeRouter";

export const operationalDeviceRouter = router({
  management: operationalDeviceManagementRouter,
  runtime: operationalDeviceRuntimeRouter,
});

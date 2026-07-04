import { DrizzleOperationalDeviceStore } from "./infrastructure/DrizzleOperationalDeviceStore";
import { OperationalDeviceAuthService } from "./services/OperationalDeviceAuthService";
import { OperationalDeviceHeartbeatService } from "./services/OperationalDeviceHeartbeatService";
import { OperationalDeviceRegistryService } from "./services/OperationalDeviceRegistryService";

const store = new DrizzleOperationalDeviceStore();

export const operationalDeviceComposition = {
  store,
  registryService: new OperationalDeviceRegistryService(store),
  authService: new OperationalDeviceAuthService(store),
  heartbeatService: new OperationalDeviceHeartbeatService(store),
};

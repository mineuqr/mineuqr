import { DrizzleOperationalDeviceStore } from "./infrastructure/DrizzleOperationalDeviceStore";
import { ScreenPairingService } from "./pairing/ScreenPairingService";
import { ScreenCredentialRecoveryService } from "./recovery/ScreenCredentialRecoveryService";
import { OperationalDeviceAuthService } from "./services/OperationalDeviceAuthService";
import { OperationalDeviceHeartbeatService } from "./services/OperationalDeviceHeartbeatService";
import { OperationalDeviceRegistryService } from "./services/OperationalDeviceRegistryService";

const store = new DrizzleOperationalDeviceStore();

export const operationalDeviceComposition = {
  store,
  registryService: new OperationalDeviceRegistryService(store),
  recoveryService: new ScreenCredentialRecoveryService(store),
  pairingService: new ScreenPairingService(store),
  authService: new OperationalDeviceAuthService(store),
  heartbeatService: new OperationalDeviceHeartbeatService(store),
};

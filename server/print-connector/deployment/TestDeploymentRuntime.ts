import type { PlatformAdapter } from "../contracts/PlatformAdapter";
import type { TransportAdapter } from "../contracts/TransportAdapter";
import type { DeploymentRuntime } from "../contracts/deployment/DeploymentRuntime";
import { createTransportAdapters } from "../transport/TransportAdapters";

export function createTestDeploymentRuntime(
  platform: PlatformAdapter,
  transports: TransportAdapter[] = createTransportAdapters()
): DeploymentRuntime {
  return {
    descriptor: {
      identity: {
        target: "embedded",
        instanceId: "test-runtime",
        label: "Test Deployment Runtime",
      },
      capabilities: {
        supportsLocalDiscovery: true,
        supportsRemoteExecution: false,
        supportsBackgroundExecution: false,
        supportsInProcessExecution: true,
      },
    },
    getPlatformAdapter: () => platform,
    getTransportAdapters: () => transports,
  };
}

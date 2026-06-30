import { describe, expect, it } from "vitest";
import { buildRuntimeIdentity, buildRuntimeCapabilities } from "../services/RuntimeIdentityBuilder";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";

describe("RuntimeIdentityBuilder", () => {
  it("builds canonical runtime identity from configuration", () => {
    const config = createTestLocalConnectorConfig({
      connectorId: "rlc-1",
      runtimeId: "runtime-abc",
      restaurantId: 42,
    });

    const identity = buildRuntimeIdentity(config);

    expect(identity.connectorId).toBe("rlc-1");
    expect(identity.runtimeId).toBe("runtime-abc");
    expect(identity.restaurantId).toBe(42);
    expect(identity.deploymentType).toBe("local_desktop");
    expect(identity.capabilities.supportsRemoteExecution).toBe(true);
    expect(identity.capabilities.supportsInProcessExecution).toBe(false);
  });

  it("exposes RLC production capabilities", () => {
    const capabilities = buildRuntimeCapabilities();
    expect(capabilities.supportsLocalDiscovery).toBe(true);
    expect(capabilities.supportsBackgroundExecution).toBe(true);
  });
});

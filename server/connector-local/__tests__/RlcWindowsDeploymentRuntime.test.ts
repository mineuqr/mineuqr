import { describe, expect, it } from "vitest";
import { isRlcWindowsHost } from "../windows/createRlcWindowsConnectorRuntime";
import { RlcWindowsDeploymentRuntime } from "../windows/RlcWindowsDeploymentRuntime";
import { buildRuntimeIdentity } from "../services/RuntimeIdentityBuilder";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import { WindowsPlatformAdapter } from "../../print-connector/platform/windows/WindowsPlatformAdapter";

describe("RlcWindowsDeploymentRuntime", () => {
  it("hosts WindowsPlatformAdapter on win32", () => {
    if (!isRlcWindowsHost()) return;

    const identity = buildRuntimeIdentity(createTestLocalConnectorConfig());
    const deployment = new RlcWindowsDeploymentRuntime(identity);

    expect(deployment.getPlatformAdapter()).toBeInstanceOf(WindowsPlatformAdapter);
    expect(deployment.descriptor.identity.target).toBe("local_desktop");
    expect(deployment.getTransportAdapters().length).toBeGreaterThan(0);
  });
});

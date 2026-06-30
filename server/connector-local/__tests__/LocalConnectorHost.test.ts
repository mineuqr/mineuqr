import { describe, expect, it } from "vitest";
import { LocalConnectorHost } from "../services/LocalConnectorHost";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import { buildRuntimeIdentity } from "../services/RuntimeIdentityBuilder";

describe("LocalConnectorHost lifecycle", () => {
  it("tracks lifecycle transitions authoritatively", () => {
    const host = new LocalConnectorHost();
    const config = createTestLocalConnectorConfig();
    const identity = buildRuntimeIdentity(config);

    host.beginStart(config, identity);
    expect(host.getLifecycle()).toBe("starting");

    host.setLifecycle("connecting");
    host.setGatewayConnected(true, "conn-1");
    host.markAuthenticated(new Date().toISOString());
    host.markRegistered(new Date().toISOString());
    host.markHeartbeat(new Date().toISOString(), "healthy");

    expect(host.getLifecycle()).toBe("healthy");
    expect(host.evaluateHealth().gatewayConnectivity).toBe("connected");
  });

  it("resets on stop", () => {
    const host = new LocalConnectorHost();
    const config = createTestLocalConnectorConfig();
    host.beginStart(config, buildRuntimeIdentity(config));
    host.setLifecycle("healthy");
    host.beginStop();
    host.markStopped();

    expect(host.getLifecycle()).toBe("stopped");
    expect(host.getSession().sessionId).toBeNull();
  });
});

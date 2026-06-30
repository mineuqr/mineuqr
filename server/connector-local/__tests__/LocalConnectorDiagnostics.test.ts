import { describe, expect, it } from "vitest";
import { LocalConnectorDiagnostics } from "../services/LocalConnectorDiagnostics";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import { buildRuntimeIdentity } from "../services/RuntimeIdentityBuilder";
import { LocalConnectorHost } from "../services/LocalConnectorHost";

describe("LocalConnectorDiagnostics", () => {
  it("snapshots identity, config, gateway, session, and health", () => {
    const host = new LocalConnectorHost();
    const config = createTestLocalConnectorConfig();
    host.beginStart(config, buildRuntimeIdentity(config));
    host.setGatewayConnected(true, "conn-diag");
    host.setSessionId("session-diag");
    host.markHeartbeat(new Date().toISOString(), "healthy");

    const snapshot = new LocalConnectorDiagnostics().snapshot(host);

    expect(snapshot.identity.connectorId).toBe(config.connectorId);
    expect(snapshot.configuration.cloudEndpoint).toBe(config.cloudEndpoint);
    expect(snapshot.gatewayConnection.connectionId).toBe("conn-diag");
    expect(snapshot.session.sessionId).toBe("session-diag");
    expect(snapshot.health.lifecycle).toBe("healthy");
    expect(snapshot.deployment.platform).toBe(config.platform);
  });
});

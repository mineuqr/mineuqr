import { describe, expect, it } from "vitest";
import type {
  ConnectorCapability,
  ConnectorEndpoint,
  ConnectorHealth,
  ConnectorIdentity,
  ConnectorMetadata,
  ConnectorRegistrationResult,
  ConnectorSession,
  ConnectorStatus,
} from "../contracts/gatewayContracts";

describe("gateway canonical models", () => {
  it("accepts representative connector identity and session shapes", () => {
    const identity: ConnectorIdentity = {
      restaurantId: 1,
      connectorInstanceId: "rlc-1",
      deploymentTarget: "local_desktop",
    };
    const metadata: ConnectorMetadata = {
      label: "Kitchen",
      version: "1.0.0",
      hostFingerprint: null,
    };
    const capabilities: ConnectorCapability = {
      supportsLocalDiscovery: true,
      supportsRemoteExecution: true,
      supportsBackgroundExecution: false,
      supportsInProcessExecution: false,
    };
    const endpoint: ConnectorEndpoint = {
      hostLabel: "kitchen",
      processPlatform: "windows",
    };
    const status: ConnectorStatus = {
      availability: "online",
      isRegistered: true,
      isHealthy: true,
      lastSeenAt: "2026-06-26T12:00:00.000Z",
      message: null,
    };
    const session: ConnectorSession = {
      identity,
      metadata,
      capabilities,
      runtime: {
        identity,
        endpoint,
        registeredAt: "2026-06-26T12:00:00.000Z",
        lastHeartbeatAt: "2026-06-26T12:00:00.000Z",
      },
      status,
    };
    const health: ConnectorHealth = {
      identity,
      status,
      heartbeatAgeMs: 1000,
      evaluatedAt: "2026-06-26T12:00:01.000Z",
    };
    const registration: ConnectorRegistrationResult = {
      identity,
      session,
      registeredAt: "2026-06-26T12:00:00.000Z",
    };

    expect(session.identity.connectorInstanceId).toBe("rlc-1");
    expect(health.status.isHealthy).toBe(true);
    expect(registration.session.metadata.label).toBe("Kitchen");
  });
});

import { describe, expect, it } from "vitest";
import { composeConnectorGateway } from "../../../connector-gateway/gatewayComposition";
import { sampleRegistration } from "../../../connector-gateway/__tests__/testFixtures";
import { PrintWorkspacePresenceReadService } from "../services/PrintWorkspacePresenceReadService";
import type { PrinterManagementService } from "../../../printer-management/services/PrinterManagementService";

function stubPrinterManagement(): PrinterManagementService {
  return {
    getCurrentPrinter: async () => ({
      configured: false,
      printer: null,
      status: null,
      isDefault: false,
      lastValidatedAt: null,
    }),
    getDiagnostics: async () => null,
  } as unknown as PrinterManagementService;
}

describe("PrintWorkspacePresenceReadService", () => {
  it("returns unregistered state when no connector session exists", async () => {
    const gateway = composeConnectorGateway();
    const service = new PrintWorkspacePresenceReadService(
      gateway.directory,
      stubPrinterManagement(),
      () => Date.parse("2026-06-30T12:05:00.000Z")
    );

    const connector = await service.getLocalConnectorStatus(1);
    expect(connector.healthLabel).toBe("Unregistered");
    expect(connector.connectorId).toBeNull();

    const session = await service.getConnectorSessionStatus(1);
    expect(session.registration).toBe("Not registered");
  });

  it("projects registered connector and session for a restaurant", async () => {
    const gateway = composeConnectorGateway();
    const now = Date.now();
    const registeredAt = new Date(now - 5 * 60 * 1000).toISOString();
    const heartbeatAt = new Date(now - 15 * 1000).toISOString();

    await gateway.registry.register(sampleRegistration());
    const session = await gateway.registry.getSession(1);
    if (!session) throw new Error("expected session");
    await gateway.repository.save({
      ...session,
      runtime: {
        ...session.runtime,
        registeredAt,
        lastHeartbeatAt: heartbeatAt,
      },
    });

    const service = new PrintWorkspacePresenceReadService(
      gateway.directory,
      stubPrinterManagement(),
      () => now
    );

    const connector = await service.getLocalConnectorStatus(1);
    expect(connector.connectorId).toBe("rlc-instance-1");
    expect(connector.healthLabel).toBe("Healthy");
    expect(connector.connectorVersion).toBe("1.0.0");
    expect(connector.runtimePlatform).toBe("windows");
    expect(connector.runtimeUptimeMs).toBe(5 * 60 * 1000);
    expect(connector.lastHeartbeatAt).toBe(heartbeatAt);

    const sessionStatus = await service.getConnectorSessionStatus(1);
    expect(sessionStatus.registration).toBe("Registered");
    expect(sessionStatus.authentication).toBe("Authenticated");
    expect(sessionStatus.transport).toContain("Connector Session");
    expect(sessionStatus.connectedSince).toBe(registeredAt);
  });

  it("builds operator diagnostics summary cards", async () => {
    const gateway = composeConnectorGateway();
    await gateway.registry.register(sampleRegistration());

    const service = new PrintWorkspacePresenceReadService(
      gateway.directory,
      stubPrinterManagement(),
      () => Date.now()
    );

    const summary = await service.getDiagnosticsSummary(1);
    expect(summary.cards).toHaveLength(3);
    expect(summary.cards[0]?.id).toBe("connector");
    expect(summary.cards[1]?.id).toBe("session");
    expect(summary.cards[2]?.id).toBe("printer");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { ConnectorGatewayService } from "../../../connector-gateway/services/ConnectorGatewayService";
import { PrintWorkspaceDiscoveryReadService } from "../services/PrintWorkspaceDiscoveryReadService";

describe("PrintWorkspaceDiscoveryReadService", () => {
  it("projects gateway discovery into workspace DTO", async () => {
    const gateway = {
      routeDiscoverPrinters: vi.fn(async () => ({
        routed: true,
        connectorInstanceId: "rlc-1",
        printers: [
          {
            id: "win:kitchen",
            name: "Kitchen",
            platform: "windows" as const,
            transport: "usb" as const,
            isDefault: false,
            isOnline: true,
          },
        ],
        failureReason: null,
        message: null,
      })),
    } as unknown as ConnectorGatewayService;

    const service = new PrintWorkspaceDiscoveryReadService(gateway, () => 1_700_000_000_000);
    const result = await service.discoverPrinters(1);

    expect(result.unavailable).toBe(false);
    expect(result.printers).toHaveLength(1);
    expect(result.discoveredAt).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it("marks discovery unavailable when connector is offline", async () => {
    const gateway = {
      routeDiscoverPrinters: vi.fn(async () => ({
        routed: false,
        connectorInstanceId: null,
        printers: null,
        failureReason: "connector_offline" as const,
        message: "Connector is offline",
      })),
    } as unknown as ConnectorGatewayService;

    const service = new PrintWorkspaceDiscoveryReadService(gateway);
    const result = await service.discoverPrinters(1);

    expect(result.unavailable).toBe(true);
    expect(result.printers).toEqual([]);
    expect(result.message).toBe("Connector is offline");
  });
});

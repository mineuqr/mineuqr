import { describe, expect, it, vi } from "vitest";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import type { PrinterInfo } from "../../print-connector/domain/PrinterInfo";
import { wireTestRlc } from "./testWiring";

function mockPrintRuntime(printers: PrinterInfo[]): PrintConnectorApi {
  return {
    discoverPrinters: vi.fn().mockResolvedValue(printers),
    getPrinterCapabilities: vi.fn().mockResolvedValue(null),
    selectPrinter: vi.fn(),
    getSelectedPrinter: vi.fn().mockResolvedValue(null),
    print: vi.fn(),
    cancel: vi.fn(),
    getStatus: vi.fn().mockResolvedValue(null),
  };
}

describe("RLC Windows gateway discovery path", () => {
  it("routes discover_printers through runtime handler to platform discovery", async () => {
    const runtime = mockPrintRuntime([
      {
        id: "win:kitchen",
        name: "Kitchen Receipt",
        platform: "windows",
        transport: "usb",
        isDefault: true,
        isOnline: true,
      },
    ]);
    const { network, local } = await wireTestRlc({ connectorRuntime: runtime });

    const host = local.createHost();
    const result = await local.bootstrap.start(host);

    const discovery = await network.gateway.gateway.routeDiscoverPrinters({
      restaurantId: 1,
      requestedAt: new Date().toISOString(),
    });

    expect(discovery.routed).toBe(true);
    expect(discovery.printers).toHaveLength(1);
    expect(discovery.printers?.[0]?.name).toBe("Kitchen Receipt");
    expect(runtime.discoverPrinters).toHaveBeenCalled();

    await local.bootstrap.stop(result);
  });

  it("returns unavailable when RLC is not connected", async () => {
    const network = (await wireTestRlc()).network;

    const discovery = await network.gateway.gateway.routeDiscoverPrinters({
      restaurantId: 1,
      requestedAt: new Date().toISOString(),
    });

    expect(discovery.routed).toBe(false);
    expect(discovery.failureReason).toMatch(/connector_(offline|unregistered)/);
    expect(discovery.printers).toBeNull();
  });
});

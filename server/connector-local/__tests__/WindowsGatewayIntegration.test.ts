import { describe, expect, it, vi } from "vitest";
import { samplePayload } from "../../connector-gateway/__tests__/testFixtures";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import { wireTestRlc } from "./testWiring";

function mockPrintRuntime(): PrintConnectorApi {
  return {
    discoverPrinters: vi.fn().mockResolvedValue([]),
    getPrinterCapabilities: vi.fn().mockResolvedValue(null),
    selectPrinter: vi.fn(),
    getSelectedPrinter: vi.fn().mockResolvedValue(null),
    print: vi.fn().mockResolvedValue({
      executionId: "e1",
      printJobId: 1,
      restaurantId: 1,
      printerId: "win:test",
      success: true,
      completedAt: new Date().toISOString(),
    }),
    cancel: vi.fn(),
    getStatus: vi.fn().mockResolvedValue(null),
  };
}

describe("RLC Windows gateway print path", () => {
  it("routes execute_print through runtime handler to print runtime", async () => {
    const runtime = mockPrintRuntime();
    const { network, local } = await wireTestRlc({ connectorRuntime: runtime });

    const host = local.createHost();
    const result = await local.bootstrap.start(host);

    const route = await network.gateway.gateway.routePrint({
      jobId: 99,
      restaurantId: 1,
      orderId: 10,
      correlationId: null,
      payload: samplePayload(1, 10),
      requestedAt: new Date().toISOString(),
    });

    expect(route.routed).toBe(true);
    expect(runtime.print).toHaveBeenCalled();

    await local.bootstrap.stop(result);
  });

  it("routes select_printer through runtime handler", async () => {
    const runtime = mockPrintRuntime();
    const { network, local } = await wireTestRlc({ connectorRuntime: runtime });

    const host = local.createHost();
    const result = await local.bootstrap.start(host);

    const selected = await network.gateway.gateway.routeSelectPrinter({
      restaurantId: 1,
      printerId: "win:kitchen",
      printerName: "Kitchen",
      platform: "windows",
      transport: "usb",
      requestedAt: new Date().toISOString(),
    });

    expect(selected.routed).toBe(true);
    expect(runtime.selectPrinter).toHaveBeenCalled();

    await local.bootstrap.stop(result);
  });

  it("returns execution payload for operator print", async () => {
    const runtime = mockPrintRuntime();
    const { network, local } = await wireTestRlc({ connectorRuntime: runtime });

    const host = local.createHost();
    const result = await local.bootstrap.start(host);

    const routed = await network.gateway.gateway.routeExecutePrint({
      jobId: 0,
      restaurantId: 1,
      orderId: 0,
      correlationId: null,
      payload: samplePayload(1, 0),
      printerId: "win:test",
      requestedAt: new Date().toISOString(),
    });

    expect(routed.routed).toBe(true);
    expect(routed.execution?.success).toBe(true);
    expect(runtime.print).toHaveBeenCalled();

    await local.bootstrap.stop(result);
  });
});

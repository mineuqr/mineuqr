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
});

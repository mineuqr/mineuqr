import { describe, expect, it, vi } from "vitest";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import { createTestLocalConnectorConfig } from "../infrastructure/EnvLocalConnectorConfigProvider";
import { RuntimeConnectorCommandHandler } from "../infrastructure/RuntimeConnectorCommandHandler";
import { LocalConnectorRuntimeFacade } from "../services/LocalConnectorRuntimeFacade";
import { mapPrintFailureToInfrastructure, mapWindowsErrorMessage } from "../windows/mapWindowsInfrastructureFailure";
import { samplePayload } from "../../connector-gateway/__tests__/testFixtures";

function mockRuntime(overrides: Partial<PrintConnectorApi> = {}): PrintConnectorApi {
  return {
    discoverPrinters: vi.fn().mockResolvedValue([
      {
        id: "win:Kitchen",
        name: "Kitchen",
        platform: "windows",
        transport: "usb",
        isDefault: true,
        isOnline: true,
      },
    ]),
    getPrinterCapabilities: vi.fn().mockResolvedValue({
      printerId: "win:Kitchen",
      transport: "usb",
      supportsRawText: true,
      supportsCut: false,
      paperWidthMm: 80,
      maxCharsPerLine: 42,
      dpi: 203,
    }),
    selectPrinter: vi.fn().mockResolvedValue({
      restaurantId: 1,
      printerId: "win:Kitchen",
      printerName: "Kitchen",
      platform: "windows",
      transport: "usb",
      selectedAt: new Date().toISOString(),
    }),
    getSelectedPrinter: vi.fn().mockResolvedValue(null),
    print: vi.fn().mockResolvedValue({
      executionId: "exec-1",
      printJobId: 1,
      restaurantId: 1,
      printerId: "win:Kitchen",
      success: true,
      completedAt: new Date().toISOString(),
    }),
    cancel: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({
      printerId: "win:Kitchen",
      isOnline: true,
      isReady: true,
      paperLow: false,
      paperOut: false,
      lastError: null,
      checkedAt: new Date().toISOString(),
    }),
    ...overrides,
  };
}

describe("LocalConnectorRuntimeFacade", () => {
  it("discovers printers", async () => {
    const runtime = mockRuntime();
    const facade = new LocalConnectorRuntimeFacade(runtime);
    const printers = await facade.discoverPrinters(1);
    expect(printers).toHaveLength(1);
  });

  it("runs test print via operator trigger", async () => {
    const runtime = mockRuntime();
    const facade = new LocalConnectorRuntimeFacade(runtime);
    await facade.testPrint(1, "win:Kitchen");
    expect(runtime.print).toHaveBeenCalled();
  });

  it("reprint uses same print path", async () => {
    const runtime = mockRuntime();
    const facade = new LocalConnectorRuntimeFacade(runtime);
    const payload = samplePayload(1, 5);
    await facade.reprint(1, 9, 5, payload);
    expect(runtime.print).toHaveBeenCalledWith(
      expect.objectContaining({ printJobId: 9, orderId: 5 })
    );
  });
});

describe("RuntimeConnectorCommandHandler", () => {
  const configProvider = { load: () => createTestLocalConnectorConfig() };

  it("handles discover_printers", async () => {
    const handler = new RuntimeConnectorCommandHandler(mockRuntime(), configProvider);
    const response = await handler.handle({
      commandId: "c1",
      type: "discover_printers",
      restaurantId: 1,
      connectorId: "rlc-1",
      correlationId: null,
      issuedAt: new Date().toISOString(),
      nonce: "n1",
      payload: {},
    });

    expect(response.success).toBe(true);
    expect((response.payload as { printers: unknown[] }).printers).toHaveLength(1);
  });

  it("handles printer selection via discover payload action", async () => {
    const runtime = mockRuntime();
    const handler = new RuntimeConnectorCommandHandler(runtime, configProvider);
    const response = await handler.handle({
      commandId: "c2",
      type: "discover_printers",
      restaurantId: 1,
      connectorId: "rlc-1",
      correlationId: null,
      issuedAt: new Date().toISOString(),
      nonce: "n2",
      payload: {
        action: "select",
        printerId: "win:Kitchen",
        printerName: "Kitchen",
        platform: "windows",
        transport: "usb",
      },
    });

    expect(response.success).toBe(true);
    expect(runtime.selectPrinter).toHaveBeenCalled();
  });

  it("handles execute_print with failure mapping", async () => {
    const runtime = mockRuntime({
      print: vi.fn().mockResolvedValue({
        executionId: "e1",
        printJobId: 1,
        restaurantId: 1,
        printerId: "win:Kitchen",
        success: false,
        failureReason: "printer_offline",
        message: "offline",
        completedAt: new Date().toISOString(),
      }),
    });
    const handler = new RuntimeConnectorCommandHandler(runtime, configProvider);
    const response = await handler.handle({
      commandId: "c3",
      type: "execute_print",
      restaurantId: 1,
      connectorId: "rlc-1",
      correlationId: null,
      issuedAt: new Date().toISOString(),
      nonce: "n3",
      payload: {
        jobId: 1,
        orderId: 2,
        printPayload: samplePayload(1, 2),
      },
    });

    expect(response.success).toBe(false);
    expect(response.failureCode).toBe(mapPrintFailureToInfrastructure("printer_offline"));
  });

  it("handles cancel_print", async () => {
    const runtime = mockRuntime({
      cancel: vi.fn().mockResolvedValue({
        executionId: "e-cancel",
        printJobId: 9,
        restaurantId: 1,
        printerId: "win:Kitchen",
        success: true,
        completedAt: new Date().toISOString(),
      }),
    });
    const handler = new RuntimeConnectorCommandHandler(runtime, configProvider);
    const response = await handler.handle({
      commandId: "c4",
      type: "cancel_print",
      restaurantId: 1,
      connectorId: "rlc-1",
      correlationId: null,
      issuedAt: new Date().toISOString(),
      nonce: "n4",
      payload: {
        executionId: "e-cancel",
        printJobId: 9,
      },
    });

    expect(response.success).toBe(true);
    expect(runtime.cancel).toHaveBeenCalled();
  });
});

describe("mapWindowsInfrastructureFailure", () => {
  it("maps permission errors to authentication_failure", () => {
    expect(mapWindowsErrorMessage("Access denied")).toBe("authentication_failure");
  });
});

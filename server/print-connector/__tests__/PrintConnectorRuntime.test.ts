import { describe, expect, it, vi } from "vitest";
import type { PrinterSelectionRepository } from "../contracts/PrinterSelectionRepository";
import type { SelectedPrinterDto } from "../contracts/PrintConnectorApi";
import { SimulatedPlatformAdapter } from "../platform/SimulatedPlatformAdapter";
import { PrintConnectorRuntime } from "../runtime/PrintConnectorRuntime";
import { mapErrorToPrintFailureReason } from "../runtime/PrintFailureMapper";
import { createTestDeploymentRuntime } from "../deployment/TestDeploymentRuntime";
import { PRINT_PAYLOAD_SCHEMA_VERSION } from "../../printing/domain/PrintPayload";

function deploymentFor(platform: SimulatedPlatformAdapter["platform"]) {
  return createTestDeploymentRuntime(new SimulatedPlatformAdapter(platform));
}

const samplePayload = {
  schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
  restaurantId: 1,
  orderId: 9,
  orderNumber: "ORD-9",
  orderStatus: "ready",
  tableNumber: 2,
  totalAmount: "10.00",
  createdAt: "2026-06-27T10:00:00.000Z",
  lineItems: [],
  requestedAt: "2026-06-27T10:01:00.000Z",
  trigger: { source: "operator" as const },
};

function createSelectionRepo(
  initial: SelectedPrinterDto | null = null
): PrinterSelectionRepository {
  let selected = initial;
  return {
    getSelected: vi.fn(async (restaurantId) =>
      selected && selected.restaurantId === restaurantId ? selected : null
    ),
    saveSelection: vi.fn(async (input) => {
      selected = {
        restaurantId: input.restaurantId,
        printerId: input.printerId,
        printerName: input.printerName,
        platform: input.platform,
        transport: input.transport,
        selectedAt: new Date().toISOString(),
      };
      return selected;
    }),
  };
}

describe("PrintConnectorRuntime", () => {
  it("discovers printers across transport types", async () => {
    const runtime = new PrintConnectorRuntime(deploymentFor("windows"), createSelectionRepo());

    const printers = await runtime.discoverPrinters({ restaurantId: 1 });
    expect(printers.length).toBe(4);
    expect(printers.map((p) => p.transport).sort()).toEqual([
      "bluetooth",
      "ethernet",
      "usb",
      "wifi",
    ]);
  });

  it("returns no_printer_selected when printing without selection", async () => {
    const runtime = new PrintConnectorRuntime(deploymentFor("linux"), createSelectionRepo());

    const result = await runtime.print({
      restaurantId: 1,
      printJobId: 10,
      orderId: 9,
      payload: samplePayload,
    });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("no_printer_selected");
  });

  it("executes print when a printer is selected", async () => {
    const runtime = new PrintConnectorRuntime(
      deploymentFor("macos"),
      createSelectionRepo({
        restaurantId: 1,
        printerId: "macos-usb-sim-01",
        printerName: "Simulated USB Printer",
        platform: "macos",
        transport: "usb",
        selectedAt: new Date().toISOString(),
      })
    );

    const result = await runtime.print({
      restaurantId: 1,
      printJobId: 11,
      orderId: 9,
      payload: samplePayload,
    });

    expect(result.success).toBe(true);
    expect(result.printerId).toBe("macos-usb-sim-01");
  });

  it("persists printer selection", async () => {
    const repo = createSelectionRepo();
    const runtime = new PrintConnectorRuntime(deploymentFor("android"), repo);

    const selected = await runtime.selectPrinter({
      restaurantId: 5,
      printerId: "android-wifi-sim-01",
      printerName: "Simulated WIFI Printer",
      platform: "android",
      transport: "wifi",
    });

    expect(selected.printerId).toBe("android-wifi-sim-01");
    expect(repo.saveSelection).toHaveBeenCalled();
  });
});

describe("PrintFailureMapper", () => {
  it("maps OS errors to canonical reasons", () => {
    expect(mapErrorToPrintFailureReason(new Error("Printer offline"))).toBe("printer_offline");
    expect(mapErrorToPrintFailureReason(new Error("Access denied"))).toBe("permission_denied");
    expect(mapErrorToPrintFailureReason(new Error("something else"))).toBe("os_failure");
  });
});

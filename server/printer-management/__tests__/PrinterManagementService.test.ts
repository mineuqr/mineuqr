import { describe, expect, it, vi } from "vitest";
import { PrinterManagementService } from "../services/PrinterManagementService";
import type { RestaurantPrinterRepository } from "../contracts/RestaurantPrinterRepository";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";

describe("PrinterManagementService", () => {
  it("provisions printer via connector and repository", async () => {
    const repo: RestaurantPrinterRepository = {
      listByRestaurant: vi.fn(async () => []),
      findByPrinterId: vi.fn(async () => null),
      getDefault: vi.fn(async () => null),
      save: vi.fn(async (input) => ({
        id: 1,
        ...input,
        isDefault: true,
        isActive: true,
        lastValidatedAt: null,
        capabilities: { printerId: input.printerId, transport: "usb", supportsRawText: true, supportsCut: false },
      })),
      rename: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      markValidated: vi.fn(),
    };

    const connector: PrintConnectorApi = {
      discoverPrinters: vi.fn(),
      getPrinterCapabilities: vi.fn(async () => ({
        printerId: "win-usb-1",
        transport: "usb",
        supportsRawText: true,
        supportsCut: false,
      })),
      selectPrinter: vi.fn(async (cmd) => ({
        restaurantId: cmd.restaurantId,
        printerId: cmd.printerId,
        printerName: cmd.printerName,
        platform: cmd.platform,
        transport: cmd.transport,
        selectedAt: new Date().toISOString(),
      })),
      getSelectedPrinter: vi.fn(),
      print: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
    };

    const service = new PrinterManagementService(repo, connector);

    const saved = await service.provisionPrinter({
      restaurantId: 1,
      printerId: "win-usb-1",
      displayName: "Kitchen",
      platform: "windows",
      transport: "usb",
    });

    expect(saved.displayName).toBe("Kitchen");
    expect(connector.selectPrinter).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it("returns unconfigured current printer when empty", async () => {
    const repo: RestaurantPrinterRepository = {
      listByRestaurant: vi.fn(async () => []),
      findByPrinterId: vi.fn(),
      getDefault: vi.fn(async () => null),
      save: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      markValidated: vi.fn(),
    };
    const connector: PrintConnectorApi = {
      discoverPrinters: vi.fn(),
      getPrinterCapabilities: vi.fn(),
      selectPrinter: vi.fn(),
      getSelectedPrinter: vi.fn(async () => null),
      print: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
    };

    const service = new PrinterManagementService(repo, connector);
    const current = await service.getCurrentPrinter(1);
    expect(current.configured).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { PrinterManagementService } from "../services/PrinterManagementService";
import type { RestaurantPrinterRepository } from "../contracts/RestaurantPrinterRepository";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import type { RestaurantPrinterDto } from "../contracts/printerManagementContracts";

function activePrinter(overrides: Partial<RestaurantPrinterDto> = {}): RestaurantPrinterDto {
  return {
    id: 1,
    restaurantId: 1,
    printerId: "win-kitchen",
    displayName: "Kitchen",
    platform: "windows",
    transport: "usb",
    isDefault: true,
    isActive: true,
    lastValidatedAt: null,
    capabilities: null,
    ...overrides,
  };
}

function createConnector(overrides: Partial<PrintConnectorApi> = {}): PrintConnectorApi {
  return {
    discoverPrinters: vi.fn(),
    getPrinterCapabilities: vi.fn(),
    selectPrinter: vi.fn(async (cmd) => ({
      restaurantId: cmd.restaurantId,
      printerId: cmd.printerId,
      printerName: cmd.printerName,
      platform: cmd.platform,
      transport: cmd.transport,
      selectedAt: new Date().toISOString(),
    })),
    getSelectedPrinter: vi.fn(async () => null),
    print: vi.fn(),
    cancel: vi.fn(),
    getStatus: vi.fn(async () => null),
    ...overrides,
  };
}

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
        capabilities: {
          printerId: input.printerId,
          transport: "usb",
          supportsRawText: true,
          supportsCut: false,
        },
      })),
      rename: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      markValidated: vi.fn(),
    };

    const connector = createConnector({
      getPrinterCapabilities: vi.fn(async () => ({
        printerId: "win-usb-1",
        transport: "usb",
        supportsRawText: true,
        supportsCut: false,
      })),
    });

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
    const connector = createConnector();

    const service = new PrinterManagementService(repo, connector);
    const current = await service.getCurrentPrinter(1);
    expect(current.configured).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
    expect(connector.getSelectedPrinter).not.toHaveBeenCalled();
  });

  it("getCurrentPrinter is read-only and does not migrate legacy selection", async () => {
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
    const connector = createConnector({
      getSelectedPrinter: vi.fn(async () => ({
        restaurantId: 1,
        printerId: "windows-usb-sim-01",
        printerName: "Simulated USB Printer",
        platform: "windows",
        transport: "usb",
        selectedAt: new Date().toISOString(),
      })),
    });

    const service = new PrinterManagementService(repo, connector);
    const current = await service.getCurrentPrinter(1);

    expect(current.configured).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("deleted printer does not reappear on getCurrentPrinter polling", async () => {
    const repo: RestaurantPrinterRepository = {
      listByRestaurant: vi.fn(async () => []),
      findByPrinterId: vi.fn(async () => null),
      getDefault: vi.fn(async () => null),
      save: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(async () => true),
      setDefault: vi.fn(),
      markValidated: vi.fn(),
    };
    const connector = createConnector({
      getSelectedPrinter: vi.fn(async () => ({
        restaurantId: 42,
        printerId: "windows-usb-sim-01",
        printerName: "Simulated USB Printer",
        platform: "windows",
        transport: "usb",
        selectedAt: new Date().toISOString(),
      })),
    });

    const service = new PrinterManagementService(repo, connector);
    await service.removePrinter(42, "windows-usb-sim-01");

    const first = await service.getCurrentPrinter(42);
    const second = await service.getCurrentPrinter(42);

    expect(first.configured).toBe(false);
    expect(second.configured).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("getCurrentPrinter reads active default only", async () => {
    const printer = activePrinter();
    const repo: RestaurantPrinterRepository = {
      listByRestaurant: vi.fn(),
      findByPrinterId: vi.fn(),
      getDefault: vi.fn(async () => printer),
      save: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      markValidated: vi.fn(),
    };
    const connector = createConnector({
      getStatus: vi.fn(async () => ({
        printerId: printer.printerId,
        isOnline: true,
        isReady: true,
        paperLow: false,
        paperOut: false,
        lastError: null,
        checkedAt: new Date().toISOString(),
      })),
    });

    const service = new PrinterManagementService(repo, connector);
    const current = await service.getCurrentPrinter(1);

    expect(current.configured).toBe(true);
    expect(current.printer?.printerId).toBe("win-kitchen");
    expect(repo.save).not.toHaveBeenCalled();
  });
});

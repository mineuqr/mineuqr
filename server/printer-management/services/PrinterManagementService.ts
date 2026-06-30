import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import { PRINT_PAYLOAD_SCHEMA_VERSION } from "../../printing/domain/PrintPayload";
import type {
  CurrentPrinterDto,
  PrinterDiagnosticsDto,
  ProvisionPrinterCommand,
  RestaurantPrinterDto,
  TestPrintResult,
} from "../contracts/printerManagementContracts";
import type { RestaurantPrinterRepository } from "../contracts/RestaurantPrinterRepository";

function buildTestPayload(restaurantId: number) {
  const now = new Date().toISOString();
  return {
    schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
    restaurantId,
    orderId: 0,
    orderNumber: "TEST-PRINT",
    orderStatus: "ready",
    tableNumber: 0,
    totalAmount: "0.00",
    createdAt: now,
    lineItems: [],
    requestedAt: now,
    trigger: { source: "operator" as const, reason: "test_print" },
  };
}

/**
 * PRINT-UX-1 / PRINT-PRINTER-CATALOG-1 — catalog orchestration via PrintConnectorApi (ADR-ARCH-017).
 * Printer Catalog SSOT: restaurant_printers only. Reads are side-effect free.
 */
export class PrinterManagementService {
  constructor(
    private readonly printers: RestaurantPrinterRepository,
    private readonly connector: PrintConnectorApi
  ) {}

  async listPrinters(restaurantId: number): Promise<RestaurantPrinterDto[]> {
    return this.printers.listByRestaurant(restaurantId);
  }

  async discoverPrinters(restaurantId: number) {
    return this.connector.discoverPrinters({ restaurantId });
  }

  async getCurrentPrinter(restaurantId: number): Promise<CurrentPrinterDto> {
    const printer = await this.printers.getDefault(restaurantId);

    if (!printer) {
      return {
        configured: false,
        printer: null,
        status: null,
        isDefault: false,
        lastValidatedAt: null,
      };
    }

    const status = await this.connector.getStatus({
      restaurantId,
      printerId: printer.printerId,
    });

    return {
      configured: true,
      printer,
      status,
      isDefault: printer.isDefault,
      lastValidatedAt: printer.lastValidatedAt,
    };
  }

  async provisionPrinter(command: ProvisionPrinterCommand): Promise<RestaurantPrinterDto> {
    const capabilities = await this.connector.getPrinterCapabilities({
      restaurantId: command.restaurantId,
      printerId: command.printerId,
    });

    const saved = await this.printers.save({
      restaurantId: command.restaurantId,
      printerId: command.printerId,
      displayName: command.displayName,
      platform: command.platform,
      transport: command.transport,
      isDefault: command.setAsDefault ?? true,
      capabilities,
    });

    await this.connector.selectPrinter({
      restaurantId: command.restaurantId,
      printerId: command.printerId,
      printerName: command.displayName,
      platform: command.platform,
      transport: command.transport,
    });

    return saved;
  }

  async removePrinter(restaurantId: number, printerId: string): Promise<boolean> {
    return this.printers.remove(restaurantId, printerId);
  }

  async renamePrinter(
    restaurantId: number,
    printerId: string,
    displayName: string
  ): Promise<RestaurantPrinterDto | null> {
    const updated = await this.printers.rename(restaurantId, printerId, displayName);
    if (updated?.isDefault) {
      await this.connector.selectPrinter({
        restaurantId,
        printerId,
        printerName: displayName,
        platform: updated.platform,
        transport: updated.transport,
      });
    }
    return updated;
  }

  async setDefaultPrinter(restaurantId: number, printerId: string): Promise<RestaurantPrinterDto | null> {
    const updated = await this.printers.setDefault(restaurantId, printerId);
    if (!updated) return null;

    await this.connector.selectPrinter({
      restaurantId,
      printerId: updated.printerId,
      printerName: updated.displayName,
      platform: updated.platform,
      transport: updated.transport,
    });

    return updated;
  }

  async getDiagnostics(restaurantId: number, printerId: string): Promise<PrinterDiagnosticsDto | null> {
    const printer = await this.printers.findByPrinterId(restaurantId, printerId);
    if (!printer) return null;

    const [status, capabilities, discoveredList] = await Promise.all([
      this.connector.getStatus({ restaurantId, printerId }),
      this.connector.getPrinterCapabilities({ restaurantId, printerId }),
      this.connector.discoverPrinters({ restaurantId }),
    ]);

    return {
      printer,
      status,
      capabilities,
      discovered: discoveredList.find((p) => p.id === printerId) ?? null,
    };
  }

  async testPrint(restaurantId: number, printerId?: string): Promise<TestPrintResult> {
    let targetId = printerId;
    if (!targetId) {
      const current = await this.printers.getDefault(restaurantId);
      targetId = current?.printerId;
    } else {
      const registered = await this.printers.findByPrinterId(restaurantId, targetId);
      if (!registered) {
        return {
          executionId: "test-unregistered",
          printJobId: 0,
          restaurantId,
          printerId: targetId,
          success: false,
          failureReason: "no_printer_selected",
          message: "Printer is not registered in the catalog",
          completedAt: new Date().toISOString(),
          validatedAt: new Date().toISOString(),
        };
      }
    }

    if (!targetId) {
      return {
        executionId: "test-unconfigured",
        printJobId: 0,
        restaurantId,
        printerId: "",
        success: false,
        failureReason: "no_printer_selected",
        message: "No printer configured",
        completedAt: new Date().toISOString(),
        validatedAt: new Date().toISOString(),
      };
    }

    const result = await this.connector.print({
      restaurantId,
      printJobId: 0,
      orderId: 0,
      printerId: targetId,
      payload: buildTestPayload(restaurantId),
    });

    const validatedAt = new Date().toISOString();
    if (result.success) {
      await this.printers.markValidated(restaurantId, targetId, validatedAt);
    }

    return { ...result, validatedAt };
  }
}

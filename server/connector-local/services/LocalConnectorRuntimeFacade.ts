import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import type { PrinterInfo } from "../../print-connector/domain/PrinterInfo";
import type { PrintExecutionResult } from "../../print-connector/domain/PrintExecutionResult";
import type { PrintPayload } from "../../printing/domain/PrintPayload";
import { PRINT_PAYLOAD_SCHEMA_VERSION } from "../../printing/domain/PrintPayload";

export type DiscoverPrintersCommandPayload = {
  action?: "discover" | "select";
  printerId?: string;
  printerName?: string;
  platform?: string;
  transport?: string;
};

export type GetPrinterStatusCommandPayload = {
  printerId: string;
};

/**
 * RLC runtime facade — discovery, selection, print, reprint, test print (no business logic).
 */
export class LocalConnectorRuntimeFacade {
  constructor(private readonly runtime: PrintConnectorApi) {}

  discoverPrinters(restaurantId: number): Promise<PrinterInfo[]> {
    return this.runtime.discoverPrinters({ restaurantId });
  }

  async selectPrinter(
    restaurantId: number,
    printer: Pick<PrinterInfo, "id" | "name" | "platform" | "transport">
  ) {
    return this.runtime.selectPrinter({
      restaurantId,
      printerId: printer.id,
      printerName: printer.name,
      platform: printer.platform,
      transport: printer.transport,
    });
  }

  getSelectedPrinter(restaurantId: number) {
    return this.runtime.getSelectedPrinter(restaurantId);
  }

  getPrinterCapabilities(restaurantId: number, printerId: string) {
    return this.runtime.getPrinterCapabilities({ restaurantId, printerId });
  }

  getPrinterStatus(restaurantId: number, printerId: string) {
    return this.runtime.getStatus({ restaurantId, printerId });
  }

  print(
    restaurantId: number,
    printJobId: number,
    orderId: number,
    payload: PrintPayload,
    printerId?: string
  ): Promise<PrintExecutionResult> {
    return this.runtime.print({
      restaurantId,
      printJobId,
      orderId,
      payload,
      printerId,
    });
  }

  reprint(
    restaurantId: number,
    printJobId: number,
    orderId: number,
    payload: PrintPayload,
    printerId?: string
  ): Promise<PrintExecutionResult> {
    return this.print(restaurantId, printJobId, orderId, payload, printerId);
  }

  testPrint(restaurantId: number, printerId?: string): Promise<PrintExecutionResult> {
    const payload: PrintPayload = {
      schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
      restaurantId,
      orderId: 0,
      orderNumber: "TEST",
      orderStatus: "test",
      tableNumber: 0,
      totalAmount: "0.00",
      createdAt: new Date().toISOString(),
      lineItems: [],
      requestedAt: new Date().toISOString(),
      trigger: { source: "operator", reason: "test_print" },
    };

    return this.print(restaurantId, 0, 0, payload, printerId);
  }
}

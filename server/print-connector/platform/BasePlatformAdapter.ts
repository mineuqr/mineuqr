import type { PlatformAdapter } from "../contracts/PlatformAdapter";
import type { PrintExecutionRequest } from "../domain/PrintExecutionRequest";
import type { PrintExecutionResult } from "../domain/PrintExecutionResult";
import type { PrinterCapability } from "../domain/PrinterCapability";
import type { PrinterInfo } from "../domain/PrinterInfo";
import type { PrinterStatus } from "../domain/PrinterStatus";
import type { PlatformType } from "../domain/PlatformType";
import {
  failureResultMessage,
  mapErrorToPrintFailureReason,
} from "../runtime/PrintFailureMapper";
import { serializePrintPayloadToText } from "../runtime/PrintPayloadTextSerializer";

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platform: PlatformType;

  abstract discoverPrinters(): Promise<PrinterInfo[]>;

  async getPrinterCapabilities(printerId: string): Promise<PrinterCapability | null> {
    const printers = await this.discoverPrinters();
    const printer = printers.find((p) => p.id === printerId);
    if (!printer) return null;

    return {
      printerId,
      transport: printer.transport,
      supportsRawText: true,
      supportsCut: false,
      paperWidthMm: 80,
      maxCharsPerLine: 42,
      dpi: 203,
    };
  }

  async getPrinterStatus(printerId: string): Promise<PrinterStatus | null> {
    const printers = await this.discoverPrinters();
    const printer = printers.find((p) => p.id === printerId);
    if (!printer) return null;

    return {
      printerId,
      isOnline: printer.isOnline,
      isReady: printer.isOnline,
      paperLow: false,
      paperOut: false,
      lastError: null,
      checkedAt: new Date().toISOString(),
    };
  }

  async deliverPrint(request: PrintExecutionRequest): Promise<PrintExecutionResult> {
    const completedAt = new Date().toISOString();
    try {
      const printers = await this.discoverPrinters();
      const printer = printers.find((p) => p.id === request.printerId);
      if (!printer) {
        return this.failure(request, "printer_offline", completedAt);
      }
      if (!printer.isOnline) {
        return this.failure(request, "printer_offline", completedAt);
      }

      const text = serializePrintPayloadToText(request.payload);
      await this.deliverTextToOsPrinter(request.printerId, text);

      return {
        executionId: request.executionId,
        printJobId: request.printJobId,
        restaurantId: request.restaurantId,
        printerId: request.printerId,
        success: true,
        completedAt,
      };
    } catch (error) {
      const reason = mapErrorToPrintFailureReason(error);
      return this.failure(request, reason, completedAt, error);
    }
  }

  async cancelPrint(executionId: string, printJobId: number): Promise<PrintExecutionResult> {
    return {
      executionId,
      printJobId,
      restaurantId: 0,
      printerId: "",
      success: false,
      failureReason: "cancelled",
      message: failureResultMessage("cancelled"),
      completedAt: new Date().toISOString(),
    };
  }

  protected abstract deliverTextToOsPrinter(printerId: string, text: string): Promise<void>;

  protected failure(
    request: PrintExecutionRequest,
    reason: PrintExecutionResult["failureReason"],
    completedAt: string,
    error?: unknown
  ): PrintExecutionResult {
    const message = reason ? failureResultMessage(reason) : failureResultMessage("unknown");

    return {
      executionId: request.executionId,
      printJobId: request.printJobId,
      restaurantId: request.restaurantId,
      printerId: request.printerId,
      success: false,
      failureReason: reason ?? "unknown",
      message,
      completedAt,
    };
  }
}

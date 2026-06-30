import type { PlatformType } from "../domain/PlatformType";
import type { PrintExecutionRequest } from "../domain/PrintExecutionRequest";
import type { PrintExecutionResult } from "../domain/PrintExecutionResult";
import type { PrinterCapability } from "../domain/PrinterCapability";
import type { PrinterInfo } from "../domain/PrinterInfo";
import type { PrinterStatus } from "../domain/PrinterStatus";

/**
 * Platform adapters own OS printer discovery, capabilities, and delivery APIs only.
 */
export interface PlatformAdapter {
  readonly platform: PlatformType;

  discoverPrinters(): Promise<PrinterInfo[]>;

  getPrinterCapabilities(printerId: string): Promise<PrinterCapability | null>;

  getPrinterStatus(printerId: string): Promise<PrinterStatus | null>;

  deliverPrint(request: PrintExecutionRequest): Promise<PrintExecutionResult>;

  cancelPrint(executionId: string, printJobId: number): Promise<PrintExecutionResult>;
}

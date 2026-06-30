import type { PrintExecutionResult } from "../domain/PrintExecutionResult";
import type { PrinterCapability } from "../domain/PrinterCapability";
import type { PrinterInfo } from "../domain/PrinterInfo";
import type { PrinterStatus } from "../domain/PrinterStatus";
import type { PrintPayload } from "../../printing/domain/PrintPayload";

export type DiscoverPrintersQuery = {
  restaurantId: number;
};

export type GetPrinterCapabilitiesQuery = {
  restaurantId: number;
  printerId: string;
};

export type SelectPrinterCommand = {
  restaurantId: number;
  printerId: string;
  printerName: string;
  platform: string;
  transport: string;
};

export type ConnectorPrintCommand = {
  restaurantId: number;
  printJobId: number;
  orderId: number;
  printerId?: string;
  payload: PrintPayload;
};

export type ConnectorCancelCommand = {
  restaurantId: number;
  executionId: string;
  printJobId: number;
};

export type GetPrinterStatusQuery = {
  restaurantId: number;
  printerId: string;
};

export type SelectedPrinterDto = {
  restaurantId: number;
  printerId: string;
  printerName: string;
  platform: string;
  transport: string;
  selectedAt: string;
};

/**
 * Platform-independent connector API — identical across Windows, macOS, Linux, Android.
 */
export interface PrintConnectorApi {
  discoverPrinters(query: DiscoverPrintersQuery): Promise<PrinterInfo[]>;

  getPrinterCapabilities(query: GetPrinterCapabilitiesQuery): Promise<PrinterCapability | null>;

  selectPrinter(command: SelectPrinterCommand): Promise<SelectedPrinterDto>;

  getSelectedPrinter(restaurantId: number): Promise<SelectedPrinterDto | null>;

  print(command: ConnectorPrintCommand): Promise<PrintExecutionResult>;

  cancel(command: ConnectorCancelCommand): Promise<PrintExecutionResult>;

  getStatus(query: GetPrinterStatusQuery): Promise<PrinterStatus | null>;
}

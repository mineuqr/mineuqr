import type { PrinterCapability } from "../../print-connector/domain/PrinterCapability";
import type { PrinterInfo } from "../../print-connector/domain/PrinterInfo";
import type { PrinterStatus } from "../../print-connector/domain/PrinterStatus";
import type { PrintExecutionResult } from "../../print-connector/domain/PrintExecutionResult";

export type RestaurantPrinterDto = {
  id: number;
  restaurantId: number;
  printerId: string;
  displayName: string;
  platform: string;
  transport: string;
  isDefault: boolean;
  isActive: boolean;
  lastValidatedAt: string | null;
  capabilities: PrinterCapability | null;
};

export type CurrentPrinterDto = {
  configured: boolean;
  printer: RestaurantPrinterDto | null;
  status: PrinterStatus | null;
  isDefault: boolean;
  lastValidatedAt: string | null;
};

export type PrinterDiagnosticsDto = {
  printer: RestaurantPrinterDto;
  status: PrinterStatus | null;
  capabilities: PrinterCapability | null;
  discovered: PrinterInfo | null;
};

export type ProvisionPrinterCommand = {
  restaurantId: number;
  printerId: string;
  displayName: string;
  platform: string;
  transport: string;
  setAsDefault?: boolean;
};

export type TestPrintResult = PrintExecutionResult & {
  validatedAt: string;
};

import type { PlatformAdapter } from "./PlatformAdapter";
import type { PrintExecutionRequest } from "../domain/PrintExecutionRequest";
import type { PrintExecutionResult } from "../domain/PrintExecutionResult";
import type { PrinterInfo } from "../domain/PrinterInfo";
import type { TransportType } from "../domain/TransportType";

/**
 * Transport adapters own transport-specific execution routing only.
 */
export interface TransportAdapter {
  readonly transport: TransportType;

  canHandle(printer: PrinterInfo): boolean;

  execute(
    request: PrintExecutionRequest,
    printer: PrinterInfo,
    platform: PlatformAdapter
  ): Promise<PrintExecutionResult>;
}

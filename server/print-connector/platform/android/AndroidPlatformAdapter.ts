import type { PrinterInfo } from "../../domain/PrinterInfo";
import { BasePlatformAdapter } from "../BasePlatformAdapter";
import { SimulatedPlatformAdapter } from "../SimulatedPlatformAdapter";

/**
 * Android platform adapter — production-ready skeleton for mobile runtime integration.
 * Server-hosted connector uses simulated printers; native Android host swaps this adapter.
 */
export class AndroidPlatformAdapter extends BasePlatformAdapter {
  readonly platform = "android" as const;

  async discoverPrinters(): Promise<PrinterInfo[]> {
    return new SimulatedPlatformAdapter("android").discoverPrinters();
  }

  protected async deliverTextToOsPrinter(_printerId: string, _text: string): Promise<void> {
    /* Android PrintManager integration belongs in native host runtime */
  }
}

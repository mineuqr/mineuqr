import type { PrinterInfo } from "../../domain/PrinterInfo";
import { BasePlatformAdapter } from "../BasePlatformAdapter";
import { shouldUseSimulatedConnector } from "../resolveHostPlatform";
import { SimulatedPlatformAdapter } from "../SimulatedPlatformAdapter";

/**
 * Android platform adapter — production-ready skeleton for mobile runtime integration.
 * Server-hosted connector returns empty discovery; native Android host swaps this adapter.
 */
export class AndroidPlatformAdapter extends BasePlatformAdapter {
  readonly platform = "android" as const;

  async discoverPrinters(): Promise<PrinterInfo[]> {
    if (shouldUseSimulatedConnector()) {
      return new SimulatedPlatformAdapter("android").discoverPrinters();
    }
    return [];
  }

  protected async deliverTextToOsPrinter(_printerId: string, _text: string): Promise<void> {
    /* Android PrintManager integration belongs in native host runtime */
  }
}

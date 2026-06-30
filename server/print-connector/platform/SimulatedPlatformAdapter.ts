import type { PrinterInfo } from "../domain/PrinterInfo";
import type { TransportType } from "../domain/TransportType";
import { BasePlatformAdapter } from "./BasePlatformAdapter";

function samplePrinters(platform: PrinterInfo["platform"]): PrinterInfo[] {
  const transports: TransportType[] = ["usb", "ethernet", "wifi", "bluetooth"];
  return transports.map((transport, index) => ({
    id: `${platform}-${transport}-sim-01`,
    name: `Simulated ${transport.toUpperCase()} Printer`,
    platform,
    transport,
    isDefault: index === 0,
    isOnline: true,
    location: "simulated",
    manufacturer: "MineuQR",
  }));
}

export class SimulatedPlatformAdapter extends BasePlatformAdapter {
  readonly platform: PrinterInfo["platform"];

  constructor(platform: PrinterInfo["platform"]) {
    super();
    this.platform = platform;
  }

  async discoverPrinters(): Promise<PrinterInfo[]> {
    return samplePrinters(this.platform);
  }

  protected async deliverTextToOsPrinter(_printerId: string, _text: string): Promise<void> {
    /* simulated success */
  }
}

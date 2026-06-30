import type { PlatformAdapter } from "../contracts/PlatformAdapter";
import type { TransportAdapter } from "../contracts/TransportAdapter";
import type { PrintExecutionRequest } from "../domain/PrintExecutionRequest";
import type { PrintExecutionResult } from "../domain/PrintExecutionResult";
import type { PrinterInfo } from "../domain/PrinterInfo";
import type { TransportType } from "../domain/TransportType";

abstract class BaseTransportAdapter implements TransportAdapter {
  abstract readonly transport: TransportType;

  canHandle(printer: PrinterInfo): boolean {
    return printer.transport === this.transport;
  }

  execute(
    request: PrintExecutionRequest,
    _printer: PrinterInfo,
    platform: PlatformAdapter
  ): Promise<PrintExecutionResult> {
    return platform.deliverPrint(request);
  }
}

export class UsbTransportAdapter extends BaseTransportAdapter {
  readonly transport = "usb" as const;
}

export class EthernetTransportAdapter extends BaseTransportAdapter {
  readonly transport = "ethernet" as const;
}

export class WifiTransportAdapter extends BaseTransportAdapter {
  readonly transport = "wifi" as const;
}

export class BluetoothTransportAdapter extends BaseTransportAdapter {
  readonly transport = "bluetooth" as const;
}

export function createTransportAdapters(): TransportAdapter[] {
  return [
    new UsbTransportAdapter(),
    new EthernetTransportAdapter(),
    new WifiTransportAdapter(),
    new BluetoothTransportAdapter(),
  ];
}

export function resolveTransportAdapter(
  printer: PrinterInfo,
  adapters: TransportAdapter[]
): TransportAdapter | null {
  return adapters.find((adapter) => adapter.canHandle(printer)) ?? null;
}

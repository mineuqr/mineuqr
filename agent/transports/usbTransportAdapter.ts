/**
 * THERMAL-PRINTING-10B — USB transport adapter (architecture only).
 */
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";

export const USB_TRANSPORT = "usb" as const;

export class UsbTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = USB_TRANSPORT;

  async deliver(_request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    return {
      status: "not-implemented",
      transport: this.transport,
      message: "USB transport adapter not implemented",
    };
  }
}

export function createUsbTransportAdapter(): UsbTransportAdapter {
  return new UsbTransportAdapter();
}

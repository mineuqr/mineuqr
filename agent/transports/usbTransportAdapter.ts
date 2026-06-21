/**
 * THERMAL-PRINTING-10C — USB transport adapter (device path delivery).
 */
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import { deliverEscPosArtifactWithRetry } from "./transportDeliveryHelper";
import type { UsbDeviceClient } from "./usbDeviceClient";

export const USB_TRANSPORT = "usb" as const;

export class UsbTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = USB_TRANSPORT;

  constructor(
    private readonly deviceClient: UsbDeviceClient,
    private readonly retryPolicy?: TransportRetryPolicy,
    private readonly defaultTimeoutMs = 5_000
  ) {}

  async deliver(request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    const endpoint = request.usbEndpoint;
    if (!endpoint) {
      return {
        status: "failed",
        transport: this.transport,
        failureCode: "endpoint-missing",
        message: "USB transport endpoint is required",
      };
    }

    return deliverEscPosArtifactWithRetry({
      request,
      transport: this.transport,
      retryPolicy: this.retryPolicy,
      deliverBytes: async (bytes) => {
        await this.deviceClient.write({
          devicePath: endpoint.devicePath,
          bytes,
          timeoutMs: this.defaultTimeoutMs,
        });
      },
    });
  }
}

export function createUsbTransportAdapter(
  deviceClient: UsbDeviceClient,
  retryPolicy?: TransportRetryPolicy
): UsbTransportAdapter {
  return new UsbTransportAdapter(deviceClient, retryPolicy);
}

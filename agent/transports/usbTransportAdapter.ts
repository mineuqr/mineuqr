/**
 * THERMAL-PRINTING-10C / WINDOWS-USB-2 — USB transport adapter.
 */
import {
  isUsbDevicePathEndpoint,
  isUsbWindowsSpoolerEndpoint,
  normalizeUsbTransportEndpoint,
} from "../../shared/printing/transports/usbTransportEndpoint";
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import { deliverEscPosArtifactWithRetry } from "./transportDeliveryHelper";
import type { DevicePathUsbClient } from "./usbDeviceClient";
import type { WindowsSpoolerDeviceClient } from "./windowsSpoolerDeviceClient";

export const USB_TRANSPORT = "usb" as const;

export class UsbTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = USB_TRANSPORT;

  constructor(
    private readonly devicePathClient: DevicePathUsbClient,
    private readonly windowsSpoolerClient: WindowsSpoolerDeviceClient,
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

    const normalized = normalizeUsbTransportEndpoint(endpoint);

    return deliverEscPosArtifactWithRetry({
      request,
      transport: this.transport,
      retryPolicy: this.retryPolicy,
      deliverBytes: async (bytes) => {
        if (isUsbWindowsSpoolerEndpoint(normalized)) {
          await this.windowsSpoolerClient.write({
            printerName: normalized.printerName,
            portName: normalized.portName,
            bytes,
            timeoutMs: this.defaultTimeoutMs,
          });
          return;
        }

        if (isUsbDevicePathEndpoint(normalized)) {
          await this.devicePathClient.write({
            devicePath: normalized.devicePath,
            bytes,
            timeoutMs: this.defaultTimeoutMs,
          });
          return;
        }
      },
    });
  }
}

export function createUsbTransportAdapter(
  devicePathClient: DevicePathUsbClient,
  windowsSpoolerClient: WindowsSpoolerDeviceClient,
  retryPolicy?: TransportRetryPolicy
): UsbTransportAdapter {
  return new UsbTransportAdapter(
    devicePathClient,
    windowsSpoolerClient,
    retryPolicy
  );
}

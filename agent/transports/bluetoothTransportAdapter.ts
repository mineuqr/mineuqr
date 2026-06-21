/**
 * THERMAL-PRINTING-10C — Bluetooth transport adapter (device path delivery).
 */
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import { deliverEscPosArtifactWithRetry } from "./transportDeliveryHelper";
import type { BluetoothDeviceClient } from "./bluetoothDeviceClient";

export const BLUETOOTH_TRANSPORT = "bluetooth" as const;

export class BluetoothTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = BLUETOOTH_TRANSPORT;

  constructor(
    private readonly deviceClient: BluetoothDeviceClient,
    private readonly retryPolicy?: TransportRetryPolicy,
    private readonly defaultTimeoutMs = 5_000
  ) {}

  async deliver(request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    const endpoint = request.bluetoothEndpoint;
    if (!endpoint) {
      return {
        status: "failed",
        transport: this.transport,
        failureCode: "endpoint-missing",
        message: "Bluetooth transport endpoint is required",
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

export function createBluetoothTransportAdapter(
  deviceClient: BluetoothDeviceClient,
  retryPolicy?: TransportRetryPolicy
): BluetoothTransportAdapter {
  return new BluetoothTransportAdapter(deviceClient, retryPolicy);
}

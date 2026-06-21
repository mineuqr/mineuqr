/**
 * THERMAL-PRINTING-10B — Bluetooth transport adapter (architecture only).
 */
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";

export const BLUETOOTH_TRANSPORT = "bluetooth" as const;

export class BluetoothTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = BLUETOOTH_TRANSPORT;

  async deliver(_request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    return {
      status: "not-implemented",
      transport: this.transport,
      message: "Bluetooth transport adapter not implemented",
    };
  }
}

export function createBluetoothTransportAdapter(): BluetoothTransportAdapter {
  return new BluetoothTransportAdapter();
}

/**
 * THERMAL-PRINTING-10B — agent transport registry factory.
 */
import { createTransportRegistry } from "../../shared/printing/transports/transportRegistry";
import type { TransportRegistry } from "../../shared/printing/transports/transportContracts";
import type { TcpSocketClient } from "./tcpSocketClient";
import { createBluetoothTransportAdapter } from "./bluetoothTransportAdapter";
import { createNetworkTransportAdapter } from "./networkTransportAdapter";
import { createUsbTransportAdapter } from "./usbTransportAdapter";

export function createAgentTransportRegistry(
  socketClient: TcpSocketClient
): TransportRegistry {
  return createTransportRegistry([
    createNetworkTransportAdapter(socketClient),
    createUsbTransportAdapter(),
    createBluetoothTransportAdapter(),
  ]);
}

/**
 * THERMAL-PRINTING-10C — agent transport registry factory.
 */
import { createTransportRegistry } from "../../shared/printing/transports/transportRegistry";
import type { TransportRegistry } from "../../shared/printing/transports/transportContracts";
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type { BluetoothDeviceClient } from "./bluetoothDeviceClient";
import { createBluetoothTransportAdapter } from "./bluetoothTransportAdapter";
import { createNetworkTransportAdapter } from "./networkTransportAdapter";
import type { TcpSocketClientFactory } from "./tcpSocketClient";
import type { UsbDeviceClient } from "./usbDeviceClient";
import { createUsbTransportAdapter } from "./usbTransportAdapter";

export type AgentTransportClients = {
  tcpSocketFactory: TcpSocketClientFactory;
  usbDeviceClient: UsbDeviceClient;
  bluetoothDeviceClient: BluetoothDeviceClient;
  retryPolicy?: TransportRetryPolicy;
};

export function createAgentTransportRegistry(
  clients: AgentTransportClients
): TransportRegistry {
  const retryPolicy = clients.retryPolicy;
  return createTransportRegistry([
    createNetworkTransportAdapter(clients.tcpSocketFactory, retryPolicy),
    createUsbTransportAdapter(clients.usbDeviceClient, retryPolicy),
    createBluetoothTransportAdapter(clients.bluetoothDeviceClient, retryPolicy),
  ]);
}

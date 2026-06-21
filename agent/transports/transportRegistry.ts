/**
 * THERMAL-PRINTING-10C / WINDOWS-USB-2 — agent transport registry factory.
 */
import { createTransportRegistry } from "../../shared/printing/transports/transportRegistry";
import type { TransportRegistry } from "../../shared/printing/transports/transportContracts";
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type { BluetoothDeviceClient } from "./bluetoothDeviceClient";
import { createBluetoothTransportAdapter } from "./bluetoothTransportAdapter";
import { createNetworkTransportAdapter } from "./networkTransportAdapter";
import type { TcpSocketClientFactory } from "./tcpSocketClient";
import type { DevicePathUsbClient } from "./usbDeviceClient";
import { createUsbTransportAdapter } from "./usbTransportAdapter";
import type { WindowsSpoolerDeviceClient } from "./windowsSpoolerDeviceClient";

export type AgentTransportClients = {
  tcpSocketFactory: TcpSocketClientFactory;
  usbDeviceClient: DevicePathUsbClient;
  windowsSpoolerDeviceClient: WindowsSpoolerDeviceClient;
  bluetoothDeviceClient: BluetoothDeviceClient;
  retryPolicy?: TransportRetryPolicy;
};

export function createAgentTransportRegistry(
  clients: AgentTransportClients
): TransportRegistry {
  const retryPolicy = clients.retryPolicy;
  return createTransportRegistry([
    createNetworkTransportAdapter(clients.tcpSocketFactory, retryPolicy),
    createUsbTransportAdapter(
      clients.usbDeviceClient,
      clients.windowsSpoolerDeviceClient,
      retryPolicy
    ),
    createBluetoothTransportAdapter(clients.bluetoothDeviceClient, retryPolicy),
  ]);
}

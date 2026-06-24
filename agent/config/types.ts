/**
 * THERMAL-PRINTING-12B — canonical print agent deployment configuration.
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import type {
  BluetoothTransportEndpoint,
  NetworkTransportEndpoint,
  UsbTransportEndpoint,
} from "../../shared/printing/transports/transportContracts";
import type { PhysicalBindingEntry } from "../../shared/printing/physicalBindings";

export interface AgentDeploymentConfig {
  agentId: string;
  agentName: string;
  serverUrl: string;
  platform: "windows";
  startupPrinters: PrinterProfile[];
  usbTransportEndpoints: Record<string, UsbTransportEndpoint>;
  physicalBindings?: Record<string, PhysicalBindingEntry>;
  networkTransportEndpoints?: Record<string, NetworkTransportEndpoint>;
  bluetoothTransportEndpoints?: Record<string, BluetoothTransportEndpoint>;
  identityStorePath?: string;
  heartbeatIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
}

/** Raw JSON file shape (supports `id` alias for `printerId` in startup printers). */
export type AgentDeploymentConfigFile = {
  agentId: string;
  agentName?: string;
  serverUrl: string;
  platform?: AgentPlatform;
  startupPrinters: Array<PrinterProfile | DeploymentPrinterProfileRef>;
  usbTransportEndpoints?: Record<string, UsbTransportEndpoint>;
  physicalBindings?: Record<string, PhysicalBindingEntry>;
  networkTransportEndpoints?: Record<string, NetworkTransportEndpoint>;
  bluetoothTransportEndpoints?: Record<string, BluetoothTransportEndpoint>;
  identityStorePath?: string;
  heartbeatIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
};

export type DeploymentPrinterProfileRef = {
  id?: string;
  printerId?: string;
  printerName?: string;
  transport?: PrinterProfile["transport"];
  paperWidth?: PrinterProfile["paperWidth"];
  capabilities?: PrinterProfile["capabilities"];
  executionCapabilities?: PrinterProfile["executionCapabilities"];
};

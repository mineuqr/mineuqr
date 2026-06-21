/**
 * THERMAL-PRINTING-6D / 10B / 10C — reference agent boot configuration.
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import type {
  BluetoothTransportEndpoint,
  NetworkTransportEndpoint,
  UsbTransportEndpoint,
} from "../../shared/printing/transports/transportContracts";
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type { IdentityStore } from "../identity/identityStore";
import type { AgentJobClient } from "../jobs/jobClient";
import type { AgentTransportClients } from "../transports/transportRegistry";
import type { AgentWebSocketClient } from "../transport/websocketClient";

export type AgentBootConfig = {
  serverUrl: string;
  agentName: string;
  platform: AgentPlatform;
  identityStore: IdentityStore;
  client?: AgentWebSocketClient;
  jobClient?: AgentJobClient;
  transportClients?: AgentTransportClients;
  networkTransportEndpoints?: Record<string, NetworkTransportEndpoint>;
  usbTransportEndpoints?: Record<string, UsbTransportEndpoint>;
  bluetoothTransportEndpoints?: Record<string, BluetoothTransportEndpoint>;
  transportRetryPolicy?: TransportRetryPolicy;
  version?: string;
  heartbeatIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  startupPrinters?: PrinterProfile[];
};

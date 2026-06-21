/**
 * THERMAL-PRINTING-6D / 10B — reference agent boot configuration.
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import type { NetworkTransportEndpoint } from "../../shared/printing/transports/transportContracts";
import type { IdentityStore } from "../identity/identityStore";
import type { AgentJobClient } from "../jobs/jobClient";
import type { TcpSocketClient } from "../transports/tcpSocketClient";
import type { AgentWebSocketClient } from "../transport/websocketClient";

export type AgentBootConfig = {
  serverUrl: string;
  agentName: string;
  platform: AgentPlatform;
  identityStore: IdentityStore;
  client?: AgentWebSocketClient;
  jobClient?: AgentJobClient;
  tcpSocketClient?: TcpSocketClient;
  networkTransportEndpoints?: Record<string, NetworkTransportEndpoint>;
  version?: string;
  heartbeatIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  startupPrinters?: PrinterProfile[];
};

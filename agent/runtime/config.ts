/**
 * THERMAL-PRINTING-6D — reference agent boot configuration.
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import type { IdentityStore } from "../identity/identityStore";
import type { AgentWebSocketClient } from "../transport/websocketClient";

export type AgentBootConfig = {
  serverUrl: string;
  agentName: string;
  platform: AgentPlatform;
  identityStore: IdentityStore;
  client?: AgentWebSocketClient;
  version?: string;
  heartbeatIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  startupPrinters?: PrinterProfile[];
};

/**
 * THERMAL-PRINTING-6A — agent connectivity state (no sockets or polling).
 */
import type { AgentStatus } from "./agentTypes";

export interface AgentConnectivityState {
  agentId: string;
  status: AgentStatus;
  lastHeartbeatAt?: string;
}

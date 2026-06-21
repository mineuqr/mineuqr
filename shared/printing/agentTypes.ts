/**
 * THERMAL-PRINTING-6A — print agent identity and registration contracts.
 */

export type AgentPlatform = "windows" | "android" | "ios";

export type AgentStatus = "offline" | "online" | "stale";

export interface PrintAgentIdentity {
  agentId: string;
  platform: AgentPlatform;
  protocolVersion: string;
}

export interface PrintAgentRegistration {
  identity: PrintAgentIdentity;
  connectedAt: string;
}

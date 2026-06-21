/**
 * THERMAL-PRINTING-6D — local registration payload (Phase-1).
 */

export interface AgentRegistrationPayload {
  agentId: string;
  agentName: string;
  version: string;
  platform: string;
}

export interface AgentRegistrationResult {
  payload: AgentRegistrationPayload;
  registeredAt: string;
}

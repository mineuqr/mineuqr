/**
 * THERMAL-PRINTING-7E.6 — read-only protocol status queries.
 */
import {
  getStoredAgentProtocolStatus,
  getStoredJobProtocolStatus,
  type AgentProtocolStatusRecord,
  type JobProtocolStatusRecord,
} from "./protocolStatusStore";

export function getAgentProtocolStatus(
  agentId: string
): AgentProtocolStatusRecord | undefined {
  return getStoredAgentProtocolStatus(agentId);
}

export function getJobProtocolStatus(jobId: number): JobProtocolStatusRecord | undefined {
  return getStoredJobProtocolStatus(jobId);
}

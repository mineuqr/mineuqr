/**
 * THERMAL-PRINTING-7E.4 — agent protocol status receiver (reporting only).
 */
import { getAgent } from "./agentRegistry";
import {
  upsertAgentProtocolStatus,
  type AgentProtocolStatusRecord,
} from "./protocolStatusStore";
import type { ProtocolAgentLifecycleState } from "../../shared/printing/agentProtocolStatusMessages";

export type RecordAgentStatusReportInput = {
  agentId: string;
  state: ProtocolAgentLifecycleState;
  timestamp: string;
};

export type RecordAgentStatusReportResult =
  | { accepted: true; duplicate: false; record: AgentProtocolStatusRecord }
  | { accepted: true; duplicate: true; record: AgentProtocolStatusRecord }
  | { accepted: false; reason: string };

export function recordAgentStatusReport(
  input: RecordAgentStatusReportInput
): RecordAgentStatusReportResult {
  const normalizedAgentId = input.agentId.trim();
  if (!normalizedAgentId) {
    return { accepted: false, reason: "Agent id is required" };
  }
  if (!input.timestamp.trim()) {
    return { accepted: false, reason: "Timestamp is required" };
  }

  const agent = getAgent(normalizedAgentId);
  if (!agent) {
    return { accepted: false, reason: "Agent not registered" };
  }

  return upsertAgentProtocolStatus({
    agentId: normalizedAgentId,
    state: input.state,
    timestamp: input.timestamp,
  });
}

/**
 * THERMAL-PRINTING-6D Phase-2 — job wire serialization helpers.
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobAssignedMessage,
} from "../../shared/printing/agentJobMessages";

export function serializeJobAssignedNotification(input: {
  agentId: string;
  jobId: number;
  timestamp: string;
}): string {
  const message: AgentJobAssignedMessage = {
    type: AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED,
    protocolVersion: DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
    agentId: input.agentId,
    jobId: input.jobId,
    timestamp: input.timestamp,
  };
  return JSON.stringify(message);
}

export function serializeJobFetchRequest(input: {
  agentId: string;
  jobId: number;
  requestId: string;
}): string {
  return JSON.stringify({
    type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST,
    protocolVersion: DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
    agentId: input.agentId,
    jobId: input.jobId,
    requestId: input.requestId,
  });
}

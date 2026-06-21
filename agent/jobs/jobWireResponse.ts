/**
 * THERMAL-PRINTING-10A — job fetch response wire helper for agent tests.
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobFetchResponseMessage,
} from "../../shared/printing/agentJobMessages";

export function serializeJobFetchResponse(
  response: Omit<AgentJobFetchResponseMessage, "type" | "protocolVersion">
): string {
  const message: AgentJobFetchResponseMessage = {
    type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE,
    protocolVersion: DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
    ...response,
  };
  return JSON.stringify(message);
}

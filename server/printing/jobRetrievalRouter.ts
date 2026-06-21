/**
 * THERMAL-PRINTING-7A.3 — transport routing for authoritative job retrieval.
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobFetchRequestMessage,
  type AgentJobFetchResponseMessage,
} from "../../shared/printing/agentJobMessages";
import type { AgentWebSocketConnection } from "./agentConnectionManager";
import { fetchAuthoritativePrintJob } from "./jobRetrievalService";

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

export async function handleAgentJobFetchRequest(
  message: AgentJobFetchRequestMessage,
  connection: AgentWebSocketConnection
): Promise<void> {
  const result = await fetchAuthoritativePrintJob({
    agentId: message.agentId,
    jobId: message.jobId,
  });

  if (result.found) {
    connection.send(
      serializeJobFetchResponse({
        requestId: message.requestId,
        found: true,
        job: result.job,
        executionPlan: result.executionPlan,
      })
    );
    return;
  }

  connection.send(
    serializeJobFetchResponse({
      requestId: message.requestId,
      found: false,
      error: result.error,
    })
  );
}

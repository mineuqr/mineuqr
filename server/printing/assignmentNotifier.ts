/**
 * THERMAL-PRINTING-7A.2 — notify assigned agent via WebSocket (transport only).
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobAssignedMessage,
} from "../../shared/printing/agentJobMessages";
import {
  AgentWebSocketReadyState,
  getConnection,
} from "./agentConnectionManager";
import type { PrintJobAssignment } from "./assignmentTypes";

export type NotifyAgentOfAssignmentInput = {
  assignment: PrintJobAssignment;
  timestamp?: string;
};

export type NotifyAgentOfAssignmentResult = {
  notified: boolean;
  reason?: "agent_disconnected";
};

function serializeJobAssignedNotification(input: {
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

export function notifyAgentOfAssignment(
  input: NotifyAgentOfAssignmentInput
): NotifyAgentOfAssignmentResult {
  const connection = getConnection(input.assignment.agentId);
  if (
    !connection ||
    connection.connection.readyState !== AgentWebSocketReadyState.OPEN
  ) {
    return { notified: false, reason: "agent_disconnected" };
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  connection.connection.send(
    serializeJobAssignedNotification({
      agentId: input.assignment.agentId,
      jobId: input.assignment.jobId,
      timestamp,
    })
  );

  return { notified: true };
}

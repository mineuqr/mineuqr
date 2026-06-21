/**
 * THERMAL-PRINTING-7E.2 — agent lifecycle status reporting (informational only).
 */
import {
  AGENT_PROTOCOL_STATUS_MESSAGE_TYPES,
  DEFAULT_AGENT_PROTOCOL_STATUS_VERSION,
  isProtocolAgentLifecycleState,
  type AgentStatusReportMessage,
  type ProtocolAgentLifecycleState,
} from "../../shared/printing/agentProtocolStatusMessages";

export type AgentStatusReportPayload = {
  agentId: string;
  timestamp: string;
  state: ProtocolAgentLifecycleState;
};

export type AgentStatusReportSender = {
  send(data: string): void;
};

export class AgentStatusReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentStatusReportError";
  }
}

export function buildAgentStatusReportMessage(
  payload: AgentStatusReportPayload
): AgentStatusReportMessage {
  if (!payload.agentId.trim()) {
    throw new AgentStatusReportError("agentId is required");
  }
  if (!payload.timestamp.trim()) {
    throw new AgentStatusReportError("timestamp is required");
  }
  if (!isProtocolAgentLifecycleState(payload.state)) {
    throw new AgentStatusReportError("Invalid agent lifecycle state");
  }

  return {
    type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT,
    protocolVersion: DEFAULT_AGENT_PROTOCOL_STATUS_VERSION,
    agentId: payload.agentId,
    timestamp: payload.timestamp,
    state: payload.state,
  };
}

export class AgentStatusReportTracker {
  private lastReportedState: ProtocolAgentLifecycleState | undefined;

  getLastReportedState(): ProtocolAgentLifecycleState | undefined {
    return this.lastReportedState;
  }

  hasReported(state: ProtocolAgentLifecycleState): boolean {
    return this.lastReportedState === state;
  }

  markReported(state: ProtocolAgentLifecycleState): void {
    this.lastReportedState = state;
  }

  clear(): void {
    this.lastReportedState = undefined;
  }
}

export function reportAgentStatus(input: {
  payload: AgentStatusReportPayload;
  sender: AgentStatusReportSender;
  tracker: AgentStatusReportTracker;
}): boolean {
  if (input.tracker.hasReported(input.payload.state)) {
    return false;
  }

  const message = buildAgentStatusReportMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markReported(input.payload.state);
  return true;
}

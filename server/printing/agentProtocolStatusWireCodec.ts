/**
 * THERMAL-PRINTING-7E — protocol status wire parsing (transport boundary).
 */
import {
  AGENT_PROTOCOL_STATUS_MESSAGE_TYPES,
  isProtocolAgentLifecycleState,
  isProtocolJobLifecycleState,
  type AgentJobStatusReportMessage,
  type AgentProtocolStatusWireMessage,
  type AgentStatusReportMessage,
} from "../../shared/printing/agentProtocolStatusMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentProtocolStatusWireMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentProtocolStatusWireMessageError";
  }
}

function validateProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentProtocolStatusWireMessageError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export function tryParseAgentProtocolStatusInboundMessage(
  rawMessage: string
): AgentStatusReportMessage | AgentJobStatusReportMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  if (
    type !== AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT &&
    type !== AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT
  ) {
    return null;
  }

  return parseAgentProtocolStatusWireMessage(rawMessage) as
    | AgentStatusReportMessage
    | AgentJobStatusReportMessage;
}

export function parseAgentProtocolStatusWireMessage(
  rawMessage: string
): AgentProtocolStatusWireMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentProtocolStatusWireMessageError("Invalid protocol status message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentProtocolStatusWireMessageError("Protocol status message must be an object");
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  const protocolVersion = message.protocolVersion;

  if (typeof type !== "string") {
    throw new AgentProtocolStatusWireMessageError("Protocol status message type is required");
  }
  if (typeof protocolVersion !== "string") {
    throw new AgentProtocolStatusWireMessageError("Protocol status protocol version is required");
  }

  validateProtocolVersion(protocolVersion);

  switch (type) {
    case AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT:
      return parseAgentStatusReport(message, protocolVersion);
    case AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT:
      return parseJobStatusReport(message, protocolVersion);
    default:
      throw new AgentProtocolStatusWireMessageError(
        `Unsupported protocol status message type: ${type}`
      );
  }
}

function parseAgentStatusReport(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentStatusReportMessage {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentProtocolStatusWireMessageError("Agent status report requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentProtocolStatusWireMessageError("Agent status report requires timestamp");
  }
  if (typeof message.state !== "string" || !isProtocolAgentLifecycleState(message.state)) {
    throw new AgentProtocolStatusWireMessageError("Agent status report requires valid state");
  }

  return {
    type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT,
    protocolVersion,
    agentId: message.agentId,
    timestamp: message.timestamp,
    state: message.state,
  };
}

function parseJobStatusReport(
  message: Record<string, unknown>,
  protocolVersion: string
): AgentJobStatusReportMessage {
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentProtocolStatusWireMessageError("Job status report requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentProtocolStatusWireMessageError("Job status report requires timestamp");
  }
  if (typeof message.jobId !== "string" || !message.jobId.trim()) {
    throw new AgentProtocolStatusWireMessageError("Job status report requires jobId");
  }
  if (typeof message.state !== "string" || !isProtocolJobLifecycleState(message.state)) {
    throw new AgentProtocolStatusWireMessageError("Job status report requires valid state");
  }

  return {
    type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT,
    protocolVersion,
    agentId: message.agentId,
    jobId: message.jobId,
    timestamp: message.timestamp,
    state: message.state,
  };
}

/**
 * THERMAL-PRINTING-10C — execution outcome wire parsing.
 */
import {
  AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES,
  isExecutionOutcomeReportCategory,
  type AgentExecutionOutcomeReportMessage,
} from "../../shared/printing/executionOutcomeMessages";
import { EXECUTION_OUTCOME_STATUSES } from "../../shared/printing/executionOutcome";
import { EXECUTION_TRANSPORTS } from "../../shared/printing/executionCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentExecutionOutcomeWireMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentExecutionOutcomeWireMessageError";
  }
}

export function tryParseAgentExecutionOutcomeInboundMessage(
  rawMessage: string
): AgentExecutionOutcomeReportMessage | null {
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
  if (message.type !== AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT) {
    return null;
  }

  return parseAgentExecutionOutcomeReportMessage(rawMessage);
}

export function parseAgentExecutionOutcomeReportMessage(
  rawMessage: string
): AgentExecutionOutcomeReportMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentExecutionOutcomeWireMessageError("Invalid execution outcome message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentExecutionOutcomeWireMessageError(
      "Execution outcome message must be an object"
    );
  }

  const message = parsed as Record<string, unknown>;
  if (message.type !== AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT) {
    throw new AgentExecutionOutcomeWireMessageError("Not an execution outcome report");
  }
  if (message.protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentExecutionOutcomeWireMessageError(
      `Unsupported protocol version: ${String(message.protocolVersion)}`
    );
  }
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentExecutionOutcomeWireMessageError("agentId is required");
  }
  if (typeof message.jobId !== "string" || !message.jobId.trim()) {
    throw new AgentExecutionOutcomeWireMessageError("jobId is required");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentExecutionOutcomeWireMessageError("timestamp is required");
  }
  if (
    typeof message.outcomeStatus !== "string" ||
    !(EXECUTION_OUTCOME_STATUSES as readonly string[]).includes(message.outcomeStatus)
  ) {
    throw new AgentExecutionOutcomeWireMessageError("Invalid outcomeStatus");
  }
  if (
    typeof message.category !== "string" ||
    !isExecutionOutcomeReportCategory(message.category)
  ) {
    throw new AgentExecutionOutcomeWireMessageError("Invalid category");
  }

  let transport: AgentExecutionOutcomeReportMessage["transport"];
  if (message.transport != null) {
    if (
      typeof message.transport !== "string" ||
      !(EXECUTION_TRANSPORTS as readonly string[]).includes(message.transport)
    ) {
      throw new AgentExecutionOutcomeWireMessageError("Invalid transport");
    }
    transport = message.transport as AgentExecutionOutcomeReportMessage["transport"];
  }

  return {
    type: AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    agentId: message.agentId,
    jobId: message.jobId,
    timestamp: message.timestamp,
    outcomeStatus: message.outcomeStatus as AgentExecutionOutcomeReportMessage["outcomeStatus"],
    category: message.category,
    transport,
    message: typeof message.message === "string" ? message.message : undefined,
  };
}

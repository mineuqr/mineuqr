/**
 * THERMAL-PRINTING-10C — execution outcome server reporting contracts.
 *
 * Separate from delivery confirmation and protocol job status.
 */
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";
import type { ExecutionOutcomeStatus } from "./executionOutcome";
import type { ExecutionTransport } from "./executionCapabilities";

export const AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES = {
  EXECUTION_OUTCOME_REPORT: "agent.execution.outcome.report",
} as const;

export type AgentExecutionOutcomeMessageType =
  (typeof AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES)[keyof typeof AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES];

export const EXECUTION_OUTCOME_REPORT_CATEGORIES = [
  "execution-success",
  "execution-failure",
  "transport-failure",
  "printer-unreachable",
  "retry-exhausted",
] as const;

export type ExecutionOutcomeReportCategory =
  (typeof EXECUTION_OUTCOME_REPORT_CATEGORIES)[number];

export interface AgentExecutionOutcomeReportMessage {
  type: typeof AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT;
  protocolVersion: string;
  agentId: string;
  jobId: string;
  timestamp: string;
  outcomeStatus: ExecutionOutcomeStatus;
  category: ExecutionOutcomeReportCategory;
  transport?: ExecutionTransport;
  message?: string;
}

export const DEFAULT_AGENT_EXECUTION_OUTCOME_PROTOCOL_VERSION =
  SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

export class ExecutionOutcomeReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionOutcomeReportValidationError";
  }
}

export type ExecutionOutcomeReportPayload = {
  agentId: string;
  jobId: string;
  timestamp: string;
  outcomeStatus: ExecutionOutcomeStatus;
  category: ExecutionOutcomeReportCategory;
  transport?: ExecutionTransport;
  message?: string;
};

export function isExecutionOutcomeReportCategory(
  value: string
): value is ExecutionOutcomeReportCategory {
  return (EXECUTION_OUTCOME_REPORT_CATEGORIES as readonly string[]).includes(value);
}

export function parseExecutionOutcomeReportJobId(jobId: string): number {
  const trimmed = jobId.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new ExecutionOutcomeReportValidationError("Invalid jobId");
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ExecutionOutcomeReportValidationError("Invalid jobId");
  }

  return parsed;
}

export function validateExecutionOutcomeReportPayload(
  payload: ExecutionOutcomeReportPayload
): {
  agentId: string;
  jobId: number;
  timestamp: string;
  outcomeStatus: ExecutionOutcomeStatus;
  category: ExecutionOutcomeReportCategory;
  transport?: ExecutionTransport;
  message?: string;
} {
  const agentId = payload.agentId.trim();
  if (!agentId) {
    throw new ExecutionOutcomeReportValidationError("agentId is required");
  }

  const timestamp = payload.timestamp.trim();
  if (!timestamp) {
    throw new ExecutionOutcomeReportValidationError("timestamp is required");
  }

  if (!isExecutionOutcomeReportCategory(payload.category)) {
    throw new ExecutionOutcomeReportValidationError("Invalid execution outcome category");
  }

  return {
    agentId,
    jobId: parseExecutionOutcomeReportJobId(payload.jobId),
    timestamp,
    outcomeStatus: payload.outcomeStatus,
    category: payload.category,
    transport: payload.transport,
    message: payload.message?.trim() ? payload.message.trim() : undefined,
  };
}

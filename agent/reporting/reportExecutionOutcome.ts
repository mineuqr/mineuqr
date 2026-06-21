/**
 * THERMAL-PRINTING-10C — agent execution outcome server reporting.
 */
import {
  AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES,
  DEFAULT_AGENT_EXECUTION_OUTCOME_PROTOCOL_VERSION,
  type AgentExecutionOutcomeReportMessage,
  type ExecutionOutcomeReportCategory,
} from "../../shared/printing/executionOutcomeMessages";
import type { ExecutionOutcomeStatus } from "../../shared/printing/executionOutcome";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";

export type ExecutionOutcomeReportPayload = {
  agentId: string;
  jobId: number;
  timestamp: string;
  outcomeStatus: ExecutionOutcomeStatus;
  category: ExecutionOutcomeReportCategory;
  transport?: ExecutionTransport;
  message?: string;
};

export type ExecutionOutcomeReportSender = {
  send(data: string): void;
};

export class ExecutionOutcomeReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionOutcomeReportError";
  }
}

export function buildExecutionOutcomeReportMessage(
  payload: ExecutionOutcomeReportPayload
): AgentExecutionOutcomeReportMessage {
  if (!payload.agentId.trim()) {
    throw new ExecutionOutcomeReportError("agentId is required");
  }
  if (!Number.isInteger(payload.jobId) || payload.jobId <= 0) {
    throw new ExecutionOutcomeReportError("jobId is required");
  }
  if (!payload.timestamp.trim()) {
    throw new ExecutionOutcomeReportError("timestamp is required");
  }

  return {
    type: AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT,
    protocolVersion: DEFAULT_AGENT_EXECUTION_OUTCOME_PROTOCOL_VERSION,
    agentId: payload.agentId,
    jobId: String(payload.jobId),
    timestamp: payload.timestamp,
    outcomeStatus: payload.outcomeStatus,
    category: payload.category,
    transport: payload.transport,
    message: payload.message,
  };
}

export class ExecutionOutcomeReportTracker {
  private readonly reported = new Map<number, ExecutionOutcomeReportCategory>();

  hasReported(jobId: number, category: ExecutionOutcomeReportCategory): boolean {
    return this.reported.get(jobId) === category;
  }

  markReported(jobId: number, category: ExecutionOutcomeReportCategory): void {
    this.reported.set(jobId, category);
  }

  clear(): void {
    this.reported.clear();
  }
}

export function reportExecutionOutcome(input: {
  payload: ExecutionOutcomeReportPayload;
  sender: ExecutionOutcomeReportSender;
  tracker: ExecutionOutcomeReportTracker;
}): boolean {
  if (input.tracker.hasReported(input.payload.jobId, input.payload.category)) {
    return false;
  }

  const message = buildExecutionOutcomeReportMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markReported(input.payload.jobId, input.payload.category);
  return true;
}

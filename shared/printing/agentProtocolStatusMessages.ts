/**
 * THERMAL-PRINTING-7E — protocol status reporting contracts (informational only).
 *
 * jobStatus ≠ printStatus — protocol progress only, not printer success.
 */
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";

export const AGENT_PROTOCOL_STATUS_MESSAGE_TYPES = {
  AGENT_STATUS_REPORT: "agent.status.report",
  JOB_STATUS_REPORT: "agent.job.status.report",
} as const;

export type AgentProtocolStatusMessageType =
  (typeof AGENT_PROTOCOL_STATUS_MESSAGE_TYPES)[keyof typeof AGENT_PROTOCOL_STATUS_MESSAGE_TYPES];

export const PROTOCOL_AGENT_LIFECYCLE_STATES = [
  "starting",
  "connecting",
  "registering",
  "ready",
  "reconnecting",
  "stopping",
  "offline",
] as const;

export type ProtocolAgentLifecycleState =
  (typeof PROTOCOL_AGENT_LIFECYCLE_STATES)[number];

export const PROTOCOL_JOB_LIFECYCLE_STATES = [
  "received",
  "validated",
  "prepared",
  "acknowledged",
  "delivered",
] as const;

export type ProtocolJobLifecycleState = (typeof PROTOCOL_JOB_LIFECYCLE_STATES)[number];

export interface AgentStatusReportMessage {
  type: typeof AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT;
  protocolVersion: string;
  agentId: string;
  timestamp: string;
  state: ProtocolAgentLifecycleState;
}

export interface AgentJobStatusReportMessage {
  type: typeof AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT;
  protocolVersion: string;
  agentId: string;
  jobId: string;
  timestamp: string;
  state: ProtocolJobLifecycleState;
}

export type AgentProtocolStatusWireMessage =
  | AgentStatusReportMessage
  | AgentJobStatusReportMessage;

export const DEFAULT_AGENT_PROTOCOL_STATUS_VERSION = SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

export class AgentProtocolStatusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentProtocolStatusValidationError";
  }
}

export type AgentStatusReportPayload = {
  agentId: string;
  timestamp: string;
  state: ProtocolAgentLifecycleState;
};

export type AgentJobStatusReportPayload = {
  agentId: string;
  jobId: string;
  timestamp: string;
  state: ProtocolJobLifecycleState;
};

function assertNonEmptyString(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AgentProtocolStatusValidationError(`${field} is required`);
  }
  return trimmed;
}

export function isProtocolAgentLifecycleState(
  value: string
): value is ProtocolAgentLifecycleState {
  return (PROTOCOL_AGENT_LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function isProtocolJobLifecycleState(value: string): value is ProtocolJobLifecycleState {
  return (PROTOCOL_JOB_LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function parseProtocolJobStatusJobId(jobId: string): number {
  const trimmed = jobId.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new AgentProtocolStatusValidationError("Invalid jobId");
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AgentProtocolStatusValidationError("Invalid jobId");
  }

  return parsed;
}

export function validateAgentStatusReportPayload(
  payload: AgentStatusReportPayload
): AgentStatusReportPayload {
  const agentId = assertNonEmptyString(payload.agentId, "agentId");
  const timestamp = assertNonEmptyString(payload.timestamp, "timestamp");

  if (!isProtocolAgentLifecycleState(payload.state)) {
    throw new AgentProtocolStatusValidationError("Invalid agent lifecycle state");
  }

  return {
    agentId,
    timestamp,
    state: payload.state,
  };
}

export function validateAgentJobStatusReportPayload(
  payload: AgentJobStatusReportPayload
): { agentId: string; jobId: number; timestamp: string; state: ProtocolJobLifecycleState } {
  const agentId = assertNonEmptyString(payload.agentId, "agentId");
  const timestamp = assertNonEmptyString(payload.timestamp, "timestamp");

  if (!isProtocolJobLifecycleState(payload.state)) {
    throw new AgentProtocolStatusValidationError("Invalid job lifecycle state");
  }

  return {
    agentId,
    jobId: parseProtocolJobStatusJobId(payload.jobId),
    timestamp,
    state: payload.state,
  };
}

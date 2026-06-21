/**
 * THERMAL-PRINTING-7E.3 — job protocol status reporting (jobStatus ≠ printStatus).
 */
import {
  AGENT_PROTOCOL_STATUS_MESSAGE_TYPES,
  DEFAULT_AGENT_PROTOCOL_STATUS_VERSION,
  isProtocolJobLifecycleState,
  type AgentJobStatusReportMessage,
  type ProtocolJobLifecycleState,
} from "../../shared/printing/agentProtocolStatusMessages";

export type JobStatusReportPayload = {
  agentId: string;
  jobId: number;
  timestamp: string;
  state: ProtocolJobLifecycleState;
};

export type JobStatusReportSender = {
  send(data: string): void;
};

export class JobStatusReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobStatusReportError";
  }
}

export function buildJobStatusReportMessage(
  payload: JobStatusReportPayload
): AgentJobStatusReportMessage {
  if (!payload.agentId.trim()) {
    throw new JobStatusReportError("agentId is required");
  }
  if (!Number.isInteger(payload.jobId) || payload.jobId <= 0) {
    throw new JobStatusReportError("jobId is required");
  }
  if (!payload.timestamp.trim()) {
    throw new JobStatusReportError("timestamp is required");
  }
  if (!isProtocolJobLifecycleState(payload.state)) {
    throw new JobStatusReportError("Invalid job lifecycle state");
  }

  return {
    type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT,
    protocolVersion: DEFAULT_AGENT_PROTOCOL_STATUS_VERSION,
    agentId: payload.agentId,
    jobId: String(payload.jobId),
    timestamp: payload.timestamp,
    state: payload.state,
  };
}

export class JobStatusReportTracker {
  private readonly reportedStates = new Map<number, ProtocolJobLifecycleState>();

  getLastReportedState(jobId: number): ProtocolJobLifecycleState | undefined {
    return this.reportedStates.get(jobId);
  }

  hasReported(jobId: number, state: ProtocolJobLifecycleState): boolean {
    return this.reportedStates.get(jobId) === state;
  }

  markReported(jobId: number, state: ProtocolJobLifecycleState): void {
    this.reportedStates.set(jobId, state);
  }

  clear(): void {
    this.reportedStates.clear();
  }
}

export function reportJobStatus(input: {
  payload: JobStatusReportPayload;
  sender: JobStatusReportSender;
  tracker: JobStatusReportTracker;
}): boolean {
  if (input.tracker.hasReported(input.payload.jobId, input.payload.state)) {
    return false;
  }

  const message = buildJobStatusReportMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markReported(input.payload.jobId, input.payload.state);
  return true;
}

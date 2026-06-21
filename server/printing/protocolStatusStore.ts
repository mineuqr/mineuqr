/**
 * THERMAL-PRINTING-7E.5 — latest-known protocol operational status (informational only).
 */
import type {
  ProtocolAgentLifecycleState,
  ProtocolJobLifecycleState,
} from "../../shared/printing/agentProtocolStatusMessages";

export type AgentProtocolStatusRecord = {
  agentId: string;
  state: ProtocolAgentLifecycleState;
  timestamp: string;
  updatedAt: string;
};

export type JobProtocolStatusRecord = {
  jobId: number;
  agentId: string;
  state: ProtocolJobLifecycleState;
  timestamp: string;
  updatedAt: string;
};

export type UpsertAgentProtocolStatusInput = {
  agentId: string;
  state: ProtocolAgentLifecycleState;
  timestamp: string;
};

export type UpsertJobProtocolStatusInput = {
  jobId: number;
  agentId: string;
  state: ProtocolJobLifecycleState;
  timestamp: string;
};

export type UpsertProtocolStatusResult<TRecord> =
  | { accepted: true; duplicate: false; record: TRecord }
  | { accepted: true; duplicate: true; record: TRecord };

const agentStatuses = new Map<string, AgentProtocolStatusRecord>();
const jobStatuses = new Map<number, JobProtocolStatusRecord>();

function isDuplicateReport(
  existing: { state: string; timestamp: string } | undefined,
  incoming: { state: string; timestamp: string }
): boolean {
  return (
    existing?.state === incoming.state && existing.timestamp === incoming.timestamp
  );
}

function isIncomingLatest(
  existing: { timestamp: string } | undefined,
  incomingTimestamp: string
): boolean {
  if (!existing) {
    return true;
  }

  return incomingTimestamp >= existing.timestamp;
}

export function getStoredAgentProtocolStatus(
  agentId: string
): AgentProtocolStatusRecord | undefined {
  return agentStatuses.get(agentId.trim());
}

export function getStoredJobProtocolStatus(jobId: number): JobProtocolStatusRecord | undefined {
  return jobStatuses.get(jobId);
}

export function clearProtocolStatusStore(): void {
  agentStatuses.clear();
  jobStatuses.clear();
}

export function upsertAgentProtocolStatus(
  input: UpsertAgentProtocolStatusInput,
  updatedAt: string = new Date().toISOString()
): UpsertProtocolStatusResult<AgentProtocolStatusRecord> {
  const normalizedAgentId = input.agentId.trim();
  const existing = agentStatuses.get(normalizedAgentId);

  if (isDuplicateReport(existing, input)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  if (!isIncomingLatest(existing, input.timestamp)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  const record: AgentProtocolStatusRecord = {
    agentId: normalizedAgentId,
    state: input.state,
    timestamp: input.timestamp,
    updatedAt,
  };
  agentStatuses.set(normalizedAgentId, record);

  return { accepted: true, duplicate: false, record };
}

export function upsertJobProtocolStatus(
  input: UpsertJobProtocolStatusInput,
  updatedAt: string = new Date().toISOString()
): UpsertProtocolStatusResult<JobProtocolStatusRecord> {
  const normalizedAgentId = input.agentId.trim();
  const existing = jobStatuses.get(input.jobId);

  if (isDuplicateReport(existing, input)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  if (!isIncomingLatest(existing, input.timestamp)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  const record: JobProtocolStatusRecord = {
    jobId: input.jobId,
    agentId: normalizedAgentId,
    state: input.state,
    timestamp: input.timestamp,
    updatedAt,
  };
  jobStatuses.set(input.jobId, record);

  return { accepted: true, duplicate: false, record };
}

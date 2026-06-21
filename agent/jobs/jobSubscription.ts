/**
 * THERMAL-PRINTING-6D Phase-2 — job assignment notification parsing (transport isolated).
 */
import {
  AGENT_JOB_MESSAGE_TYPES,
  DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
  type AgentJobAssignedMessage,
} from "../../shared/printing/agentJobMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import type { JobAssignedEvent, JobSubscriptionListener } from "./subscriptionTypes";

export class JobSubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobSubscriptionError";
  }
}

export function parseJobAssignedNotification(rawMessage: string): AgentJobAssignedMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new JobSubscriptionError("Invalid job notification JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new JobSubscriptionError("Job notification must be an object");
  }

  const message = parsed as Record<string, unknown>;
  if (message.type !== AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED) {
    throw new JobSubscriptionError("Not a job assignment notification");
  }
  if (message.protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new JobSubscriptionError("Unsupported job notification protocol version");
  }
  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new JobSubscriptionError("Job notification requires agentId");
  }
  if (!Number.isInteger(message.jobId) || (message.jobId as number) <= 0) {
    throw new JobSubscriptionError("Job notification requires jobId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new JobSubscriptionError("Job notification requires timestamp");
  }

  return {
    type: AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED,
    protocolVersion: DEFAULT_AGENT_JOB_PROTOCOL_VERSION,
    agentId: message.agentId,
    jobId: message.jobId as number,
    timestamp: message.timestamp,
  };
}

export function toJobAssignedEvent(message: AgentJobAssignedMessage): JobAssignedEvent {
  return {
    agentId: message.agentId,
    jobId: message.jobId,
    timestamp: message.timestamp,
    protocolVersion: message.protocolVersion,
  };
}

export type JobSubscriptionOptions = {
  agentId: string;
  listeners?: JobSubscriptionListener[];
};

export class JobSubscription {
  private readonly listeners = new Set<JobSubscriptionListener>();
  private readonly seenNotificationKeys = new Set<string>();

  constructor(private readonly options: JobSubscriptionOptions) {
    for (const listener of options.listeners ?? []) {
      this.listeners.add(listener);
    }
  }

  onJobAssigned(listener: JobSubscriptionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  handleTransportMessage(rawMessage: string): boolean {
    let message: AgentJobAssignedMessage;
    try {
      message = parseJobAssignedNotification(rawMessage);
    } catch {
      return false;
    }

    if (message.agentId !== this.options.agentId) {
      return false;
    }

    const dedupeKey = `${message.jobId}:${message.timestamp}`;
    if (this.seenNotificationKeys.has(dedupeKey)) {
      return true;
    }
    this.seenNotificationKeys.add(dedupeKey);

    const event = toJobAssignedEvent(message);
    this.listeners.forEach((listener) => {
      listener(event);
    });
    return true;
  }
}

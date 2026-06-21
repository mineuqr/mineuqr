/**
 * THERMAL-PRINTING-6D Phase-2 — internal job assignment event types.
 */

export type JobAssignedEvent = {
  agentId: string;
  jobId: number;
  timestamp: string;
  protocolVersion: string;
};

export type JobSubscriptionListener = (event: JobAssignedEvent) => void;

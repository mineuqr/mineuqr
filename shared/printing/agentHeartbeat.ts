/**
 * THERMAL-PRINTING-6A — agent heartbeat contracts and staleness evaluation.
 */
import type { AgentStatus } from "./agentTypes";

export const DEFAULT_AGENT_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export interface AgentHeartbeat {
  agentId: string;
  protocolVersion: string;
  timestamp: string;
}

export type AgentHeartbeatEvaluationOptions = {
  now?: Date;
  staleThresholdMs?: number;
};

export function isAgentStale(
  lastHeartbeatAt: string | undefined,
  options: AgentHeartbeatEvaluationOptions = {}
): boolean {
  if (!lastHeartbeatAt) {
    return true;
  }

  const now = options.now ?? new Date();
  const staleThresholdMs =
    options.staleThresholdMs ?? DEFAULT_AGENT_STALE_THRESHOLD_MS;
  const elapsedMs = now.getTime() - new Date(lastHeartbeatAt).getTime();

  return elapsedMs > staleThresholdMs;
}

export type CalculateAgentStatusInput = {
  isRegistered: boolean;
  lastHeartbeatAt?: string;
} & AgentHeartbeatEvaluationOptions;

export function calculateAgentStatus(input: CalculateAgentStatusInput): AgentStatus {
  if (!input.isRegistered) {
    return "offline";
  }

  if (isAgentStale(input.lastHeartbeatAt, input)) {
    return "stale";
  }

  return "online";
}

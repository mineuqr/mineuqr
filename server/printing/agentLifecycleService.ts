/**
 * THERMAL-PRINTING-6A — agent registration, heartbeat, and status evaluation.
 */
import type { AgentConnectivityState } from "../../shared/printing/agentConnectivity";
import type { AgentHeartbeat } from "../../shared/printing/agentHeartbeat";
import { calculateAgentStatus } from "../../shared/printing/agentHeartbeat";
import type { PrintAgentRegistration } from "../../shared/printing/agentTypes";
import {
  getAgent,
  listAgents,
  registerAgent,
  AgentRegistryError,
  type RegisterAgentInput,
  unregisterAgent,
  updateAgentHeartbeat,
} from "./agentRegistry";

export class AgentLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentLifecycleError";
  }
}

export type AgentLifecycleEvaluationOptions = {
  now?: Date;
  staleThresholdMs?: number;
};

export function registerPrintAgent(
  input: RegisterAgentInput
): PrintAgentRegistration {
  return registerAgent(input);
}

export function unregisterPrintAgent(agentId: string): boolean {
  return unregisterAgent(agentId);
}

export function recordAgentHeartbeat(heartbeat: AgentHeartbeat): void {
  if (!heartbeat.agentId.trim()) {
    throw new AgentLifecycleError("Agent id is required");
  }
  if (!heartbeat.timestamp.trim()) {
    throw new AgentLifecycleError("Heartbeat timestamp is required");
  }

  try {
    updateAgentHeartbeat(heartbeat.agentId, heartbeat.timestamp);
  } catch (error) {
    if (error instanceof AgentRegistryError) {
      throw new AgentLifecycleError(error.message);
    }
    throw error;
  }
}

export function getAgentConnectivityState(
  agentId: string,
  options: AgentLifecycleEvaluationOptions = {}
): AgentConnectivityState | undefined {
  const agent = getAgent(agentId);
  if (!agent) {
    return undefined;
  }

  return {
    agentId: agent.registration.identity.agentId,
    status: calculateAgentStatus({
      isRegistered: true,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      now: options.now,
      staleThresholdMs: options.staleThresholdMs,
    }),
    lastHeartbeatAt: agent.lastHeartbeatAt,
  };
}

export function listAgentConnectivityStates(
  options: AgentLifecycleEvaluationOptions = {}
): AgentConnectivityState[] {
  return listAgents().map((agent) => ({
    agentId: agent.registration.identity.agentId,
    status: calculateAgentStatus({
      isRegistered: true,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      now: options.now,
      staleThresholdMs: options.staleThresholdMs,
    }),
    lastHeartbeatAt: agent.lastHeartbeatAt,
  }));
}

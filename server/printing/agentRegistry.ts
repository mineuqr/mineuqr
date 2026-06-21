/**
 * THERMAL-PRINTING-6A — in-memory print agent registry (no persistence).
 */
import type { PrintAgentCapabilities } from "../../shared/printing/printAgentProtocol";
import type {
  PrintAgentIdentity,
  PrintAgentRegistration,
} from "../../shared/printing/agentTypes";

export class AgentRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRegistryError";
  }
}

export interface RegisteredAgent {
  registration: PrintAgentRegistration;
  capabilities?: PrintAgentCapabilities;
  lastHeartbeatAt?: string;
}

export type RegisterAgentInput = {
  identity: PrintAgentIdentity;
  capabilities?: PrintAgentCapabilities;
  connectedAt?: string;
};

const agents = new Map<string, RegisteredAgent>();

function normalizeAgentId(agentId: string): string {
  const normalized = agentId.trim();
  if (!normalized) {
    throw new AgentRegistryError("Agent id is required");
  }
  return normalized;
}

function validateIdentity(identity: PrintAgentIdentity): PrintAgentIdentity {
  return {
    agentId: normalizeAgentId(identity.agentId),
    platform: identity.platform,
    protocolVersion: identity.protocolVersion.trim(),
  };
}

export function registerAgent(input: RegisterAgentInput): PrintAgentRegistration {
  const identity = validateIdentity(input.identity);
  if (!identity.protocolVersion) {
    throw new AgentRegistryError("Protocol version is required");
  }

  const connectedAt = input.connectedAt ?? new Date().toISOString();
  const registration: PrintAgentRegistration = {
    identity,
    connectedAt,
  };

  agents.set(identity.agentId, {
    registration,
    capabilities: input.capabilities ? { ...input.capabilities } : undefined,
    lastHeartbeatAt: connectedAt,
  });

  return registration;
}

export function unregisterAgent(agentId: string): boolean {
  return agents.delete(normalizeAgentId(agentId));
}

export function getAgent(agentId: string): RegisteredAgent | undefined {
  return agents.get(normalizeAgentId(agentId));
}

export function listAgents(): RegisteredAgent[] {
  return Array.from(agents.values()).sort((left, right) =>
    left.registration.identity.agentId.localeCompare(
      right.registration.identity.agentId
    )
  );
}

export function updateAgentHeartbeat(agentId: string, timestamp: string): void {
  const agent = getAgent(agentId);
  if (!agent) {
    throw new AgentRegistryError(`Agent not registered: ${agentId}`);
  }

  agent.lastHeartbeatAt = timestamp;
}

export function clearAgentRegistry(): void {
  agents.clear();
}

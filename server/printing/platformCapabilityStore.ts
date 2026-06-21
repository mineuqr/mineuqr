/**
 * THERMAL-PRINTING-8C.4 — latest-known platform capability reports (informational only).
 */
import {
  fingerprintPlatformCapabilities,
  type PlatformCapabilities,
} from "../../shared/printing/platformCapabilities";

export type AgentPlatformCapabilityRecord = {
  agentId: string;
  capabilities: PlatformCapabilities;
  timestamp: string;
  updatedAt: string;
};

export type UpsertAgentPlatformCapabilityInput = {
  agentId: string;
  capabilities: PlatformCapabilities;
  timestamp: string;
};

export type UpsertAgentPlatformCapabilityResult =
  | { accepted: true; duplicate: false; record: AgentPlatformCapabilityRecord }
  | { accepted: true; duplicate: true; record: AgentPlatformCapabilityRecord };

const capabilityReports = new Map<string, AgentPlatformCapabilityRecord>();

function isDuplicateReport(
  existing: AgentPlatformCapabilityRecord | undefined,
  incoming: UpsertAgentPlatformCapabilityInput
): boolean {
  if (!existing) {
    return false;
  }

  return (
    existing.timestamp === incoming.timestamp &&
    fingerprintPlatformCapabilities(existing.capabilities) ===
      fingerprintPlatformCapabilities(incoming.capabilities)
  );
}

function isIncomingLatest(
  existing: AgentPlatformCapabilityRecord | undefined,
  incomingTimestamp: string
): boolean {
  if (!existing) {
    return true;
  }

  return incomingTimestamp >= existing.timestamp;
}

export function getStoredAgentPlatformCapabilities(
  agentId: string
): AgentPlatformCapabilityRecord | undefined {
  return capabilityReports.get(agentId.trim());
}

export function listStoredAgentPlatformCapabilities(): AgentPlatformCapabilityRecord[] {
  return Array.from(capabilityReports.values()).sort((left, right) =>
    left.agentId.localeCompare(right.agentId)
  );
}

export function clearPlatformCapabilityStore(): void {
  capabilityReports.clear();
}

export function upsertAgentPlatformCapabilities(
  input: UpsertAgentPlatformCapabilityInput,
  updatedAt: string = new Date().toISOString()
): UpsertAgentPlatformCapabilityResult {
  const normalizedAgentId = input.agentId.trim();
  const existing = capabilityReports.get(normalizedAgentId);

  if (isDuplicateReport(existing, input)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  if (!isIncomingLatest(existing, input.timestamp)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  const record: AgentPlatformCapabilityRecord = {
    agentId: normalizedAgentId,
    capabilities: {
      platform: input.capabilities.platform,
      transports: { ...input.capabilities.transports },
      execution: { ...input.capabilities.execution },
    },
    timestamp: input.timestamp,
    updatedAt,
  };
  capabilityReports.set(normalizedAgentId, record);

  return { accepted: true, duplicate: false, record };
}

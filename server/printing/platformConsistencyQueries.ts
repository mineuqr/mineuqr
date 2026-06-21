/**
 * THERMAL-PRINTING-8D.4 — read-only platform consistency queries.
 */
import { getAgent } from "./agentRegistry";
import { getStoredAgentPlatformCapabilities } from "./platformCapabilityStore";
import type { PlatformConsistencyState } from "./platformConsistencyTypes";

export function getPlatformConsistency(
  agentId: string
): PlatformConsistencyState | undefined {
  const agent = getAgent(agentId);
  if (!agent) {
    return undefined;
  }

  const helloPlatform = agent.registration.identity.platform;
  const capabilityRecord = getStoredAgentPlatformCapabilities(agentId);
  const capabilityPlatform = capabilityRecord?.capabilities.platform;

  return {
    agentId: agent.registration.identity.agentId,
    helloPlatform,
    capabilityPlatform,
    consistent:
      capabilityPlatform !== undefined && helloPlatform === capabilityPlatform,
  };
}

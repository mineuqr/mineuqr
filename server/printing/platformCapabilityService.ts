/**
 * THERMAL-PRINTING-8C.3 — platform capability receiver (informational only).
 */
import {
  validateAgentPlatformCapabilitiesReportPayload,
  type PlatformCapabilities,
} from "../../shared/printing/platformCapabilities";
import { getAgent } from "./agentRegistry";
import type { PlatformConsistencyValidationResult } from "./platformConsistencyTypes";
import { validatePlatformConsistency } from "./platformConsistencyValidator";
import {
  upsertAgentPlatformCapabilities,
  type AgentPlatformCapabilityRecord,
} from "./platformCapabilityStore";

export type RecordPlatformCapabilitiesReportInput = {
  agentId: string;
  timestamp: string;
  platform: PlatformCapabilities["platform"];
  capabilities: Omit<PlatformCapabilities, "platform">;
};

export type RecordPlatformCapabilitiesReportResult =
  | { accepted: true; duplicate: false; record: AgentPlatformCapabilityRecord }
  | { accepted: true; duplicate: true; record: AgentPlatformCapabilityRecord }
  | {
      accepted: false;
      reason: string;
      platformMismatch?: PlatformConsistencyValidationResult;
    };

export function recordPlatformCapabilitiesReport(
  input: RecordPlatformCapabilitiesReportInput
): RecordPlatformCapabilitiesReportResult {
  try {
    const payload = validateAgentPlatformCapabilitiesReportPayload({
      agentId: input.agentId,
      timestamp: input.timestamp,
      platform: input.platform,
      capabilities: input.capabilities,
    });

    const agent = getAgent(payload.agentId);
    if (!agent) {
      return { accepted: false, reason: "Agent not registered" };
    }

    const consistency = validatePlatformConsistency({
      agentId: payload.agentId,
      helloPlatform: agent.registration.identity.platform,
      capabilityPlatform: payload.capabilities.platform,
    });
    if (!consistency.consistent) {
      return {
        accepted: false,
        reason: consistency.reason ?? "Platform identity mismatch",
        platformMismatch: consistency,
      };
    }

    return upsertAgentPlatformCapabilities({
      agentId: payload.agentId,
      timestamp: payload.timestamp,
      capabilities: payload.capabilities,
    });
  } catch (error) {
    return {
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

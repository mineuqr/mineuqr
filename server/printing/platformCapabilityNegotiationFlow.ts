/**
 * THERMAL-PRINTING-8C.6 / 8D — platform capability negotiation orchestration.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  recordPlatformCapabilitiesReport,
  type RecordPlatformCapabilitiesReportInput,
} from "./platformCapabilityService";
import type { AgentPlatformCapabilityRecord } from "./platformCapabilityStore";
import type { PlatformConsistencyValidationResult } from "./platformConsistencyTypes";

export type ProcessAgentPlatformCapabilitiesReportResult =
  | { accepted: true; duplicate: false; record: AgentPlatformCapabilityRecord }
  | { accepted: true; duplicate: true; record: AgentPlatformCapabilityRecord }
  | {
      accepted: false;
      reason: string;
      platformMismatch?: PlatformConsistencyValidationResult;
    };

export function processAgentPlatformCapabilitiesReport(
  input: RecordPlatformCapabilitiesReportInput
): ProcessAgentPlatformCapabilitiesReportResult {
  const result = recordPlatformCapabilitiesReport(input);

  if (!result.accepted) {
    if (result.platformMismatch) {
      opsLog({
        type: OPS_EVENT.print_agent_platform_mismatch,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        metadata: {
          agentId: result.platformMismatch.agentId,
          helloPlatform: result.platformMismatch.helloPlatform,
          capabilityPlatform: result.platformMismatch.capabilityPlatform,
        },
      });
    }
    return result;
  }

  if (!result.duplicate) {
    opsLog({
      type: OPS_EVENT.print_agent_platform_match,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      metadata: {
        agentId: input.agentId,
        platform: result.record.capabilities.platform,
      },
    });
  }

  return result;
}

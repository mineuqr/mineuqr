/**
 * THERMAL-PRINTING-8C.6 — platform capability negotiation orchestration.
 */
import {
  recordPlatformCapabilitiesReport,
  type RecordPlatformCapabilitiesReportInput,
} from "./platformCapabilityService";
import type { AgentPlatformCapabilityRecord } from "./platformCapabilityStore";

export type ProcessAgentPlatformCapabilitiesReportResult =
  | { accepted: true; duplicate: false; record: AgentPlatformCapabilityRecord }
  | { accepted: true; duplicate: true; record: AgentPlatformCapabilityRecord }
  | { accepted: false; reason: string };

export function processAgentPlatformCapabilitiesReport(
  input: RecordPlatformCapabilitiesReportInput
): ProcessAgentPlatformCapabilitiesReportResult {
  return recordPlatformCapabilitiesReport(input);
}

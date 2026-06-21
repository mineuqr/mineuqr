/**
 * THERMAL-PRINTING-8C.5 — read-only platform capability queries.
 */
import type { SupportedPlatform } from "../../shared/printing/platformCapabilities";
import {
  getStoredAgentPlatformCapabilities,
  listStoredAgentPlatformCapabilities,
  type AgentPlatformCapabilityRecord,
} from "./platformCapabilityStore";

export type PlatformCapabilitySummary = {
  agentCount: number;
  platforms: Record<SupportedPlatform, number>;
  transports: {
    usb: number;
    network: number;
    bluetooth: number;
  };
  localPrintingAgents: number;
};

export function getAgentPlatformCapabilities(
  agentId: string
): AgentPlatformCapabilityRecord | undefined {
  return getStoredAgentPlatformCapabilities(agentId);
}

export function getPlatformCapabilitySummary(): PlatformCapabilitySummary {
  const records = listStoredAgentPlatformCapabilities();

  const summary: PlatformCapabilitySummary = {
    agentCount: records.length,
    platforms: {
      windows: 0,
      android: 0,
      ios: 0,
    },
    transports: {
      usb: 0,
      network: 0,
      bluetooth: 0,
    },
    localPrintingAgents: 0,
  };

  for (const record of records) {
    summary.platforms[record.capabilities.platform] += 1;
    if (record.capabilities.transports.usb) summary.transports.usb += 1;
    if (record.capabilities.transports.network) summary.transports.network += 1;
    if (record.capabilities.transports.bluetooth) summary.transports.bluetooth += 1;
    if (record.capabilities.execution.localPrinting) {
      summary.localPrintingAgents += 1;
    }
  }

  return summary;
}

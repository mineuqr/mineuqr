/**
 * THERMAL-PRINTING-9D — agent startup negotiation (hello → profiles → capabilities).
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import {
  ANDROID_PLATFORM_CAPABILITIES,
  IOS_PLATFORM_CAPABILITIES,
  reportPlatformCapabilities,
  PlatformCapabilitiesReportTracker,
  WINDOWS_PLATFORM_CAPABILITIES,
} from "../platform/reportPlatformCapabilities";
import {
  reportPrinterProfiles,
  PrinterProfilesReportTracker,
} from "../printers/reportPrinterProfiles";
import type { AgentWireSender } from "../registration/registerAgent";

export type AgentStartupReportingState = {
  printerProfilesTracker: PrinterProfilesReportTracker;
  platformCapabilitiesTracker: PlatformCapabilitiesReportTracker;
};

export function createAgentStartupReportingState(): AgentStartupReportingState {
  return {
    printerProfilesTracker: new PrinterProfilesReportTracker(),
    platformCapabilitiesTracker: new PlatformCapabilitiesReportTracker(),
  };
}

export function platformCapabilitiesForAgent(
  platform: AgentPlatform
): PlatformCapabilities {
  switch (platform) {
    case "android":
      return ANDROID_PLATFORM_CAPABILITIES;
    case "ios":
      return IOS_PLATFORM_CAPABILITIES;
    case "windows":
    default:
      return WINDOWS_PLATFORM_CAPABILITIES;
  }
}

export function performAgentStartupReporting(input: {
  agentId: string;
  platform: AgentPlatform;
  sender: AgentWireSender;
  reporting: AgentStartupReportingState;
  timestamp?: string;
  printers?: PrinterProfile[];
}): { reportedProfiles: boolean; reportedCapabilities: boolean } {
  const timestamp = input.timestamp ?? new Date().toISOString();
  let reportedProfiles = false;

  if (input.printers && input.printers.length > 0) {
    reportedProfiles = reportPrinterProfiles({
      payload: {
        agentId: input.agentId,
        timestamp,
        printers: input.printers,
      },
      sender: input.sender,
      tracker: input.reporting.printerProfilesTracker,
    });
  }

  const reportedCapabilities = reportPlatformCapabilities({
    payload: {
      agentId: input.agentId,
      timestamp,
      capabilities: platformCapabilitiesForAgent(input.platform),
    },
    sender: input.sender,
    tracker: input.reporting.platformCapabilitiesTracker,
  });

  return { reportedProfiles, reportedCapabilities };
}

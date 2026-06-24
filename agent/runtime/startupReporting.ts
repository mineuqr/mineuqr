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
import {
  reportBindingStatus,
  BindingStatusReportTracker,
} from "../bindings/reportBindingStatus";
import type { AgentPrinterBindingReportPayload } from "../../shared/printing/printerBindingReport";
import type { AgentWireSender } from "../registration/registerAgent";

export type AgentStartupReportingState = {
  printerProfilesTracker: PrinterProfilesReportTracker;
  platformCapabilitiesTracker: PlatformCapabilitiesReportTracker;
  bindingStatusTracker: BindingStatusReportTracker;
};

export function createAgentStartupReportingState(): AgentStartupReportingState {
  return {
    printerProfilesTracker: new PrinterProfilesReportTracker(),
    platformCapabilitiesTracker: new PlatformCapabilitiesReportTracker(),
    bindingStatusTracker: new BindingStatusReportTracker(),
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
  bindingStatus?: AgentPrinterBindingReportPayload;
}): {
  reportedProfiles: boolean;
  reportedCapabilities: boolean;
  reportedBindingStatus: boolean;
} {
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

  let reportedBindingStatus = false;
  if (input.bindingStatus) {
    reportedBindingStatus = reportBindingStatus({
      payload: input.bindingStatus,
      sender: input.sender,
      tracker: input.reporting.bindingStatusTracker,
      force: true,
    });
  }

  return { reportedProfiles, reportedCapabilities, reportedBindingStatus };
}

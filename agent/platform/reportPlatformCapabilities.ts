/**
 * THERMAL-PRINTING-8C.2 — agent platform capability reporting (informational only).
 */
import {
  AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES,
  DEFAULT_PLATFORM_CAPABILITY_PROTOCOL_VERSION,
  fingerprintPlatformCapabilities,
  validatePlatformCapabilities,
  type AgentPlatformCapabilitiesReportMessage,
  type PlatformCapabilities,
} from "../../shared/printing/platformCapabilities";

export type PlatformCapabilitiesReportPayload = {
  agentId: string;
  timestamp: string;
  capabilities: PlatformCapabilities;
};

export type PlatformCapabilitiesReportSender = {
  send(data: string): void;
};

export class PlatformCapabilitiesReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformCapabilitiesReportError";
  }
}

export function buildPlatformCapabilitiesReportMessage(
  payload: PlatformCapabilitiesReportPayload
): AgentPlatformCapabilitiesReportMessage {
  const validated = validatePlatformCapabilities(payload.capabilities);

  if (!payload.agentId.trim()) {
    throw new PlatformCapabilitiesReportError("agentId is required");
  }
  if (!payload.timestamp.trim()) {
    throw new PlatformCapabilitiesReportError("timestamp is required");
  }

  return {
    type: AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT,
    protocolVersion: DEFAULT_PLATFORM_CAPABILITY_PROTOCOL_VERSION,
    agentId: payload.agentId,
    timestamp: payload.timestamp,
    platform: validated.platform,
    capabilities: {
      transports: validated.transports,
      execution: validated.execution,
    },
  };
}

export class PlatformCapabilitiesReportTracker {
  private lastFingerprint: string | undefined;

  hasReportedCapabilities(capabilities: PlatformCapabilities): boolean {
    if (!this.lastFingerprint) {
      return false;
    }

    return (
      this.lastFingerprint === fingerprintPlatformCapabilities(capabilities)
    );
  }

  markReported(capabilities: PlatformCapabilities): void {
    this.lastFingerprint = fingerprintPlatformCapabilities(capabilities);
  }

  clear(): void {
    this.lastFingerprint = undefined;
  }
}

export function reportPlatformCapabilities(input: {
  payload: PlatformCapabilitiesReportPayload;
  sender: PlatformCapabilitiesReportSender;
  tracker: PlatformCapabilitiesReportTracker;
}): boolean {
  if (input.tracker.hasReportedCapabilities(input.payload.capabilities)) {
    return false;
  }

  const message = buildPlatformCapabilitiesReportMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markReported(input.payload.capabilities);
  return true;
}

export const WINDOWS_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  platform: "windows",
  transports: { usb: true, network: true, bluetooth: false },
  execution: { localPrinting: true },
};

export const ANDROID_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  platform: "android",
  transports: { usb: false, network: true, bluetooth: true },
  execution: { localPrinting: true },
};

export const IOS_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  platform: "ios",
  transports: { usb: false, network: true, bluetooth: true },
  execution: { localPrinting: false },
};

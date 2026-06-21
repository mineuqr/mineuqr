/**
 * THERMAL-PRINTING-8C — platform capability contracts (informational only).
 *
 * Platform Capability ≠ Printer Capability ≠ Routing Decision
 */
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";
import type { AgentPlatform } from "./agentTypes";

export const AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES = {
  CAPABILITIES_REPORT: "agent.platform.capabilities.report",
} as const;

export type AgentPlatformCapabilityMessageType =
  (typeof AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES)[keyof typeof AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES];

export const SUPPORTED_PLATFORMS = ["windows", "android", "ios"] as const;

export type SupportedPlatform = AgentPlatform;

export interface PlatformTransportCapabilities {
  usb: boolean;
  network: boolean;
  bluetooth: boolean;
}

export interface PlatformExecutionCapabilities {
  localPrinting: boolean;
}

export interface PlatformCapabilities {
  platform: SupportedPlatform;
  transports: PlatformTransportCapabilities;
  execution: PlatformExecutionCapabilities;
}

export interface AgentPlatformCapabilitiesReportMessage {
  type: typeof AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT;
  protocolVersion: string;
  agentId: string;
  timestamp: string;
  platform: SupportedPlatform;
  capabilities: Omit<PlatformCapabilities, "platform">;
}

export const DEFAULT_PLATFORM_CAPABILITY_PROTOCOL_VERSION =
  SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

export class PlatformCapabilityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformCapabilityValidationError";
  }
}

export type AgentPlatformCapabilitiesReportPayload = {
  agentId: string;
  timestamp: string;
  platform: SupportedPlatform;
  capabilities: Omit<PlatformCapabilities, "platform">;
};

function assertNonEmptyString(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new PlatformCapabilityValidationError(`${field} is required`);
  }
  return trimmed;
}

export function isSupportedPlatform(value: string): value is SupportedPlatform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(value);
}

export function validatePlatformTransportCapabilities(
  transports: unknown
): PlatformTransportCapabilities {
  if (!transports || typeof transports !== "object") {
    throw new PlatformCapabilityValidationError("Platform transports are required");
  }

  const value = transports as Record<string, unknown>;
  const fields: Array<keyof PlatformTransportCapabilities> = ["usb", "network", "bluetooth"];
  const normalized = {} as PlatformTransportCapabilities;

  for (const field of fields) {
    if (typeof value[field] !== "boolean") {
      throw new PlatformCapabilityValidationError(`Transport ${field} must be boolean`);
    }
    normalized[field] = value[field];
  }

  return normalized;
}

export function validatePlatformExecutionCapabilities(
  execution: unknown
): PlatformExecutionCapabilities {
  if (!execution || typeof execution !== "object") {
    throw new PlatformCapabilityValidationError("Platform execution capabilities are required");
  }

  const value = execution as Record<string, unknown>;
  if (typeof value.localPrinting !== "boolean") {
    throw new PlatformCapabilityValidationError("execution.localPrinting must be boolean");
  }

  return { localPrinting: value.localPrinting };
}

export function validatePlatformCapabilities(
  input: PlatformCapabilities
): PlatformCapabilities {
  if (!isSupportedPlatform(input.platform)) {
    throw new PlatformCapabilityValidationError("Invalid platform");
  }

  return {
    platform: input.platform,
    transports: validatePlatformTransportCapabilities(input.transports),
    execution: validatePlatformExecutionCapabilities(input.execution),
  };
}

export function validateAgentPlatformCapabilitiesReportPayload(
  payload: AgentPlatformCapabilitiesReportPayload
): { agentId: string; timestamp: string; capabilities: PlatformCapabilities } {
  const agentId = assertNonEmptyString(payload.agentId, "agentId");
  const timestamp = assertNonEmptyString(payload.timestamp, "timestamp");

  if (!isSupportedPlatform(payload.platform)) {
    throw new PlatformCapabilityValidationError("Invalid platform");
  }

  return {
    agentId,
    timestamp,
    capabilities: validatePlatformCapabilities({
      platform: payload.platform,
      transports: payload.capabilities.transports,
      execution: payload.capabilities.execution,
    }),
  };
}

export function fingerprintPlatformCapabilities(
  capabilities: PlatformCapabilities
): string {
  return JSON.stringify({
    platform: capabilities.platform,
    transports: capabilities.transports,
    execution: capabilities.execution,
  });
}

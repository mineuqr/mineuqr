/**
 * THERMAL-PRINTING-8C — platform capability wire parsing (transport boundary).
 */
import {
  AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES,
  validateAgentPlatformCapabilitiesReportPayload,
  type AgentPlatformCapabilitiesReportMessage,
} from "../../shared/printing/platformCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentPlatformCapabilityWireMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentPlatformCapabilityWireMessageError";
  }
}

function validateProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentPlatformCapabilityWireMessageError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export function tryParseAgentPlatformCapabilityInboundMessage(
  rawMessage: string
): AgentPlatformCapabilitiesReportMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const message = parsed as Record<string, unknown>;
  if (message.type !== AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT) {
    return null;
  }

  return parseAgentPlatformCapabilityWireMessage(rawMessage);
}

export function parseAgentPlatformCapabilityWireMessage(
  rawMessage: string
): AgentPlatformCapabilitiesReportMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentPlatformCapabilityWireMessageError("Invalid platform capability message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentPlatformCapabilityWireMessageError(
      "Platform capability message must be an object"
    );
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  const protocolVersion = message.protocolVersion;

  if (type !== AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT) {
    throw new AgentPlatformCapabilityWireMessageError(
      "Unsupported platform capability message type"
    );
  }
  if (typeof protocolVersion !== "string") {
    throw new AgentPlatformCapabilityWireMessageError(
      "Platform capability protocol version is required"
    );
  }

  validateProtocolVersion(protocolVersion);

  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentPlatformCapabilityWireMessageError(
      "Platform capability report requires agentId"
    );
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentPlatformCapabilityWireMessageError(
      "Platform capability report requires timestamp"
    );
  }
  if (typeof message.platform !== "string") {
    throw new AgentPlatformCapabilityWireMessageError(
      "Platform capability report requires platform"
    );
  }
  if (!message.capabilities || typeof message.capabilities !== "object") {
    throw new AgentPlatformCapabilityWireMessageError(
      "Platform capability report requires capabilities"
    );
  }

  const capabilities = message.capabilities as Record<string, unknown>;
  const validated = validateAgentPlatformCapabilitiesReportPayload({
    agentId: message.agentId,
    timestamp: message.timestamp,
    platform: message.platform as never,
    capabilities: {
      transports: capabilities.transports as never,
      execution: capabilities.execution as never,
    },
  });

  return {
    type: AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT,
    protocolVersion,
    agentId: validated.agentId,
    timestamp: validated.timestamp,
    platform: validated.capabilities.platform,
    capabilities: {
      transports: validated.capabilities.transports,
      execution: validated.capabilities.execution,
    },
  };
}

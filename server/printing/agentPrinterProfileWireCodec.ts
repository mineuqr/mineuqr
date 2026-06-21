/**
 * THERMAL-PRINTING-7F — printer profile inventory wire parsing (transport boundary).
 */
import {
  AGENT_PRINTER_PROFILE_MESSAGE_TYPES,
  validatePrinterProfilesInventory,
  type AgentPrinterProfilesReportMessage,
} from "../../shared/printing/printerProfiles";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentPrinterProfileWireMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentPrinterProfileWireMessageError";
  }
}

function validateProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentPrinterProfileWireMessageError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export function tryParseAgentPrinterProfileInboundMessage(
  rawMessage: string
): AgentPrinterProfilesReportMessage | null {
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
  if (message.type !== AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT) {
    return null;
  }

  return parseAgentPrinterProfileWireMessage(rawMessage);
}

export function parseAgentPrinterProfileWireMessage(
  rawMessage: string
): AgentPrinterProfilesReportMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentPrinterProfileWireMessageError("Invalid printer profile message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentPrinterProfileWireMessageError("Printer profile message must be an object");
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  const protocolVersion = message.protocolVersion;

  if (type !== AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT) {
    throw new AgentPrinterProfileWireMessageError("Unsupported printer profile message type");
  }
  if (typeof protocolVersion !== "string") {
    throw new AgentPrinterProfileWireMessageError("Printer profile protocol version is required");
  }

  validateProtocolVersion(protocolVersion);

  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentPrinterProfileWireMessageError("Printer profile report requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentPrinterProfileWireMessageError("Printer profile report requires timestamp");
  }

  const printers = validatePrinterProfilesInventory(message.printers as never);

  return {
    type: AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT,
    protocolVersion,
    agentId: message.agentId,
    timestamp: message.timestamp,
    printers,
  };
}

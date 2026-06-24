/**
 * THERMAL-PRINTING-13I.3A — printer binding status wire parsing (transport boundary).
 */
import {
  AGENT_PRINTER_BINDING_MESSAGE_TYPES,
  validateAgentPrinterBindingReportInventory,
  type AgentPrinterBindingReportMessage,
} from "../../shared/printing/printerBindingReport";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export class AgentPrinterBindingWireMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentPrinterBindingWireMessageError";
  }
}

function validateProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new AgentPrinterBindingWireMessageError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export function tryParseAgentPrinterBindingInboundMessage(
  rawMessage: string
): AgentPrinterBindingReportMessage | null {
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
  if (message.type !== AGENT_PRINTER_BINDING_MESSAGE_TYPES.BINDING_REPORT) {
    return null;
  }

  return parseAgentPrinterBindingWireMessage(rawMessage);
}

export function parseAgentPrinterBindingWireMessage(
  rawMessage: string
): AgentPrinterBindingReportMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    throw new AgentPrinterBindingWireMessageError("Invalid printer binding message JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AgentPrinterBindingWireMessageError("Printer binding message must be an object");
  }

  const message = parsed as Record<string, unknown>;
  const type = message.type;
  const protocolVersion = message.protocolVersion;

  if (type !== AGENT_PRINTER_BINDING_MESSAGE_TYPES.BINDING_REPORT) {
    throw new AgentPrinterBindingWireMessageError("Unsupported printer binding message type");
  }
  if (typeof protocolVersion !== "string") {
    throw new AgentPrinterBindingWireMessageError("Printer binding protocol version is required");
  }

  validateProtocolVersion(protocolVersion);

  if (typeof message.agentId !== "string" || !message.agentId.trim()) {
    throw new AgentPrinterBindingWireMessageError("Printer binding report requires agentId");
  }
  if (typeof message.timestamp !== "string" || !message.timestamp.trim()) {
    throw new AgentPrinterBindingWireMessageError("Printer binding report requires timestamp");
  }

  const bindings = validateAgentPrinterBindingReportInventory(message.bindings as never);

  return {
    type: AGENT_PRINTER_BINDING_MESSAGE_TYPES.BINDING_REPORT,
    protocolVersion,
    agentId: message.agentId,
    timestamp: message.timestamp,
    bindings,
  };
}

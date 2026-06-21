/**
 * THERMAL-PRINTING-5C — print agent protocol helpers (no networking or persistence).
 */
import { randomUUID } from "node:crypto";
import type { BrowserPrintRequest } from "../../shared/printing/browserBridgeTypes";
import {
  SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
  type PrintAgentCapabilities,
  type PrintAgentPlatform,
  type PrintAgentRequest,
  type PrintAgentResponse,
} from "../../shared/printing/printAgentProtocol";

export class PrintAgentProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintAgentProtocolError";
  }
}

export { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION };

export function validateProtocolVersion(protocolVersion: string): void {
  if (protocolVersion !== SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION) {
    throw new PrintAgentProtocolError(
      `Unsupported print agent protocol version: ${protocolVersion}`
    );
  }
}

export type CreatePrintAgentRequestInput = BrowserPrintRequest & {
  requestId?: string;
};

export function createPrintAgentRequest(
  input: CreatePrintAgentRequestInput
): PrintAgentRequest {
  if (!Number.isInteger(input.printJobId) || input.printJobId <= 0) {
    throw new PrintAgentProtocolError("Invalid printJobId");
  }
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new PrintAgentProtocolError("Invalid restaurantId");
  }
  if (!input.payloadBase64.trim()) {
    throw new PrintAgentProtocolError("payloadBase64 is required");
  }

  return {
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    requestId: input.requestId ?? randomUUID(),
    printJobId: input.printJobId,
    restaurantId: input.restaurantId,
    payloadBase64: input.payloadBase64,
  };
}

export type CreatePrintAgentResponseInput = {
  requestId: string;
  accepted: boolean;
  error?: string;
  protocolVersion?: string;
};

export function createPrintAgentResponse(
  input: CreatePrintAgentResponseInput
): PrintAgentResponse {
  const protocolVersion = input.protocolVersion ?? SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;
  validateProtocolVersion(protocolVersion);

  if (!input.requestId.trim()) {
    throw new PrintAgentProtocolError("requestId is required");
  }
  if (!input.accepted && !input.error?.trim()) {
    throw new PrintAgentProtocolError("error is required when accepted is false");
  }

  return {
    protocolVersion,
    requestId: input.requestId,
    accepted: input.accepted,
    ...(input.error?.trim() ? { error: input.error.trim() } : {}),
  };
}

export type CreatePrintAgentCapabilitiesInput = {
  platform: PrintAgentPlatform;
  transports: string[];
  printers: number;
  protocolVersion?: string;
};

export function createPrintAgentCapabilities(
  input: CreatePrintAgentCapabilitiesInput
): PrintAgentCapabilities {
  const protocolVersion = input.protocolVersion ?? SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;
  validateProtocolVersion(protocolVersion);

  if (!Number.isInteger(input.printers) || input.printers < 0) {
    throw new PrintAgentProtocolError("Invalid printers count");
  }
  if (input.transports.length === 0) {
    throw new PrintAgentProtocolError("At least one transport capability is required");
  }

  return {
    protocolVersion,
    platform: input.platform,
    transports: [...input.transports],
    printers: input.printers,
  };
}

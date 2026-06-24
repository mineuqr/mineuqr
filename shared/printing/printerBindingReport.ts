/**
 * THERMAL-PRINTING-13I.3A — agent printer binding status wire contracts.
 */
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";
import {
  RUNTIME_BINDING_STATUSES,
  type RuntimeBindingStatus,
} from "./printerBinding";

export const AGENT_PRINTER_BINDING_MESSAGE_TYPES = {
  BINDING_REPORT: "agent.printer.binding.report",
} as const;

export type AgentPrinterBindingMessageType =
  (typeof AGENT_PRINTER_BINDING_MESSAGE_TYPES)[keyof typeof AGENT_PRINTER_BINDING_MESSAGE_TYPES];

export type AgentPrinterBindingReportItem = {
  profileId: string;
  logicalPrinterName: string;
  bindingStatus: RuntimeBindingStatus;
  windowsPrinterName: string | null;
  portName: string | null;
  lastValidatedAt: string;
  message?: string;
};

export interface AgentPrinterBindingReportMessage {
  type: typeof AGENT_PRINTER_BINDING_MESSAGE_TYPES.BINDING_REPORT;
  protocolVersion: string;
  agentId: string;
  timestamp: string;
  bindings: AgentPrinterBindingReportItem[];
}

export const DEFAULT_AGENT_PRINTER_BINDING_PROTOCOL_VERSION =
  SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

export class PrinterBindingReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrinterBindingReportValidationError";
  }
}

export type AgentPrinterBindingReportPayload = {
  agentId: string;
  timestamp: string;
  bindings: AgentPrinterBindingReportItem[];
};

function assertNonEmptyString(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new PrinterBindingReportValidationError(`${field} is required`);
  }
  return trimmed;
}

function isRuntimeBindingStatus(value: string): value is RuntimeBindingStatus {
  return (RUNTIME_BINDING_STATUSES as readonly string[]).includes(value);
}

function validateNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new PrinterBindingReportValidationError(`${field} must be a string or null`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateAgentPrinterBindingReportItem(
  item: AgentPrinterBindingReportItem
): AgentPrinterBindingReportItem {
  const profileId = assertNonEmptyString(item.profileId, "profileId");
  const logicalPrinterName = assertNonEmptyString(item.logicalPrinterName, "logicalPrinterName");
  const lastValidatedAt = assertNonEmptyString(item.lastValidatedAt, "lastValidatedAt");

  if (!isRuntimeBindingStatus(item.bindingStatus)) {
    throw new PrinterBindingReportValidationError(
      `Invalid bindingStatus. Expected one of: ${RUNTIME_BINDING_STATUSES.join(", ")}`
    );
  }

  const windowsPrinterName = validateNullableString(item.windowsPrinterName, "windowsPrinterName");
  const portName = validateNullableString(item.portName, "portName");

  if (item.bindingStatus === "BOUND" && !windowsPrinterName) {
    throw new PrinterBindingReportValidationError(
      "BOUND bindingStatus requires windowsPrinterName"
    );
  }

  let message: string | undefined;
  if (item.message !== undefined) {
    if (typeof item.message !== "string" || !item.message.trim()) {
      throw new PrinterBindingReportValidationError("message must be a non-empty string when provided");
    }
    message = item.message.trim();
  }

  return {
    profileId,
    logicalPrinterName,
    bindingStatus: item.bindingStatus,
    windowsPrinterName,
    portName,
    lastValidatedAt,
    ...(message ? { message } : {}),
  };
}

export function validateAgentPrinterBindingReportInventory(
  bindings: AgentPrinterBindingReportItem[]
): AgentPrinterBindingReportItem[] {
  if (!Array.isArray(bindings)) {
    throw new PrinterBindingReportValidationError("Binding inventory must be an array");
  }

  const seenProfileIds = new Set<string>();
  return bindings.map((binding, index) => {
    const normalized = validateAgentPrinterBindingReportItem(binding);
    if (seenProfileIds.has(normalized.profileId)) {
      throw new PrinterBindingReportValidationError(
        `Duplicate profileId in binding report at index ${index}`
      );
    }
    seenProfileIds.add(normalized.profileId);
    return normalized;
  });
}

export function validateAgentPrinterBindingReportPayload(
  payload: AgentPrinterBindingReportPayload
): AgentPrinterBindingReportPayload {
  const agentId = assertNonEmptyString(payload.agentId, "agentId");
  const timestamp = assertNonEmptyString(payload.timestamp, "timestamp");
  const bindings = validateAgentPrinterBindingReportInventory(payload.bindings);

  return {
    agentId,
    timestamp,
    bindings,
  };
}

export function fingerprintPrinterBindingReportInventory(
  bindings: readonly AgentPrinterBindingReportItem[]
): string {
  return JSON.stringify(
    [...bindings]
      .map((binding) => ({
        profileId: binding.profileId,
        logicalPrinterName: binding.logicalPrinterName,
        bindingStatus: binding.bindingStatus,
        windowsPrinterName: binding.windowsPrinterName,
        portName: binding.portName,
        message: binding.message ?? null,
      }))
      .sort((left, right) => left.profileId.localeCompare(right.profileId))
  );
}

/**
 * THERMAL-PRINTING-7F — printer profile contracts (informational only).
 *
 * Printer Profile ≠ Assignment ≠ Routing ≠ Resolution
 */
import {
  DEFAULT_ARABIC_RENDERING_MODE,
  isArabicRenderingMode,
  type ArabicRenderingMode,
} from "./arabic/arabicRenderingMode";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "./printAgentProtocol";
import { PAPER_WIDTH_MM, type PaperWidthMm } from "./types";

export type { ArabicRenderingMode } from "./arabic/arabicRenderingMode";
export {
  ARABIC_RENDERING_MODES,
  DEFAULT_ARABIC_RENDERING_MODE,
  isArabicRenderingMode,
  normalizeArabicRenderingMode,
} from "./arabic/arabicRenderingMode";

export const AGENT_PRINTER_PROFILE_MESSAGE_TYPES = {
  PROFILES_REPORT: "agent.printer.profiles.report",
} as const;

export type AgentPrinterProfileMessageType =
  (typeof AGENT_PRINTER_PROFILE_MESSAGE_TYPES)[keyof typeof AGENT_PRINTER_PROFILE_MESSAGE_TYPES];

export const PRINTER_PROFILE_TRANSPORTS = ["usb", "network", "bluetooth"] as const;

export type PrinterProfileTransport = (typeof PRINTER_PROFILE_TRANSPORTS)[number];

export type PrinterProfilePaperWidth = PaperWidthMm;

export const PRINTER_PROFILE_PAPER_WIDTHS = [
  PAPER_WIDTH_MM.W58,
  PAPER_WIDTH_MM.W80,
] as const;

export interface PrinterProfileCapabilities {
  escpos: boolean;
  cutter: boolean;
  cashDrawer: boolean;
  qrCode: boolean;
  imagePrinting: boolean;
}

export interface PrinterProfileExecutionCapabilities {
  airprint: boolean;
  vendorSdk: boolean;
  vendorSdkId?: string;
}

export interface PrinterProfile {
  printerId: string;
  printerName: string;
  transport: PrinterProfileTransport;
  capabilities: PrinterProfileCapabilities;
  executionCapabilities: PrinterProfileExecutionCapabilities;
  paperWidth: PrinterProfilePaperWidth;
  /**
   * Arabic output strategy. Omitted profiles validate to `auto`.
   * @see THERMAL-PRINTING-13D
   */
  arabicRenderingMode?: ArabicRenderingMode;
}

export interface AgentPrinterProfilesReportMessage {
  type: typeof AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT;
  protocolVersion: string;
  agentId: string;
  timestamp: string;
  printers: PrinterProfile[];
}

export const DEFAULT_AGENT_PRINTER_PROFILE_PROTOCOL_VERSION =
  SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

export class PrinterProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrinterProfileValidationError";
  }
}

export type AgentPrinterProfilesReportPayload = {
  agentId: string;
  timestamp: string;
  printers: PrinterProfile[];
};

function assertNonEmptyString(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new PrinterProfileValidationError(`${field} is required`);
  }
  return trimmed;
}

export function isPrinterProfileTransport(value: string): value is PrinterProfileTransport {
  return (PRINTER_PROFILE_TRANSPORTS as readonly string[]).includes(value);
}

export function isPrinterProfilePaperWidth(value: number): value is PrinterProfilePaperWidth {
  return value === PAPER_WIDTH_MM.W58 || value === PAPER_WIDTH_MM.W80;
}

export const DEFAULT_PRINTER_PROFILE_EXECUTION_CAPABILITIES: PrinterProfileExecutionCapabilities =
  Object.freeze({
    airprint: false,
    vendorSdk: false,
  });

export function validatePrinterProfileExecutionCapabilities(
  executionCapabilities: unknown
): PrinterProfileExecutionCapabilities {
  if (!executionCapabilities || typeof executionCapabilities !== "object") {
    return { ...DEFAULT_PRINTER_PROFILE_EXECUTION_CAPABILITIES };
  }

  const value = executionCapabilities as Record<string, unknown>;
  if (typeof value.airprint !== "boolean") {
    throw new PrinterProfileValidationError("executionCapabilities.airprint must be boolean");
  }
  if (typeof value.vendorSdk !== "boolean") {
    throw new PrinterProfileValidationError("executionCapabilities.vendorSdk must be boolean");
  }

  let vendorSdkId: string | undefined;
  if (value.vendorSdkId !== undefined) {
    if (typeof value.vendorSdkId !== "string" || !value.vendorSdkId.trim()) {
      throw new PrinterProfileValidationError(
        "executionCapabilities.vendorSdkId must be a non-empty string when provided"
      );
    }
    vendorSdkId = value.vendorSdkId.trim();
  }

  if (vendorSdkId && !value.vendorSdk) {
    throw new PrinterProfileValidationError(
      "executionCapabilities.vendorSdkId requires vendorSdk capability"
    );
  }

  return vendorSdkId
    ? { airprint: value.airprint, vendorSdk: value.vendorSdk, vendorSdkId }
    : { airprint: value.airprint, vendorSdk: value.vendorSdk };
}

export function validatePrinterProfileCapabilities(
  capabilities: unknown
): PrinterProfileCapabilities {
  if (!capabilities || typeof capabilities !== "object") {
    throw new PrinterProfileValidationError("Printer capabilities are required");
  }

  const value = capabilities as Record<string, unknown>;
  const fields: Array<keyof PrinterProfileCapabilities> = [
    "escpos",
    "cutter",
    "cashDrawer",
    "qrCode",
    "imagePrinting",
  ];

  const normalized = {} as PrinterProfileCapabilities;
  for (const field of fields) {
    if (typeof value[field] !== "boolean") {
      throw new PrinterProfileValidationError(`Printer capability ${field} must be boolean`);
    }
    normalized[field] = value[field];
  }

  return normalized;
}

export function validateArabicRenderingMode(value: unknown): ArabicRenderingMode {
  if (value === undefined) {
    return DEFAULT_ARABIC_RENDERING_MODE;
  }
  if (typeof value !== "string" || !isArabicRenderingMode(value)) {
    throw new PrinterProfileValidationError(
      `Invalid arabicRenderingMode. Expected one of: auto, raster, escpos-codepage, disabled`
    );
  }
  return value;
}

export function validatePrinterProfile(profile: PrinterProfile): PrinterProfile {
  const printerId = assertNonEmptyString(profile.printerId, "printerId");
  const printerName = assertNonEmptyString(profile.printerName, "printerName");

  if (!isPrinterProfileTransport(profile.transport)) {
    throw new PrinterProfileValidationError("Invalid printer transport");
  }
  if (!isPrinterProfilePaperWidth(profile.paperWidth)) {
    throw new PrinterProfileValidationError("Invalid printer paperWidth");
  }

  return {
    printerId,
    printerName,
    transport: profile.transport,
    capabilities: validatePrinterProfileCapabilities(profile.capabilities),
    executionCapabilities: validatePrinterProfileExecutionCapabilities(
      profile.executionCapabilities
    ),
    paperWidth: profile.paperWidth,
    arabicRenderingMode: validateArabicRenderingMode(profile.arabicRenderingMode),
  };
}

export function validatePrinterProfilesInventory(
  profiles: PrinterProfile[]
): PrinterProfile[] {
  if (!Array.isArray(profiles)) {
    throw new PrinterProfileValidationError("Printer inventory must be an array");
  }

  const seenPrinterIds = new Set<string>();
  return profiles.map((profile, index) => {
    const normalized = validatePrinterProfile(profile);
    if (seenPrinterIds.has(normalized.printerId)) {
      throw new PrinterProfileValidationError(
        `Duplicate printerId in inventory at index ${index}`
      );
    }
    seenPrinterIds.add(normalized.printerId);
    return normalized;
  });
}

export function validateAgentPrinterProfilesReportPayload(
  payload: AgentPrinterProfilesReportPayload
): { agentId: string; timestamp: string; printers: PrinterProfile[] } {
  const agentId = assertNonEmptyString(payload.agentId, "agentId");
  const timestamp = assertNonEmptyString(payload.timestamp, "timestamp");
  const printers = validatePrinterProfilesInventory(payload.printers);

  return {
    agentId,
    timestamp,
    printers,
  };
}

export function fingerprintPrinterProfilesInventory(profiles: readonly PrinterProfile[]): string {
  return JSON.stringify(
    [...profiles]
      .map((profile) => ({
        printerId: profile.printerId,
        printerName: profile.printerName,
        transport: profile.transport,
        capabilities: profile.capabilities,
        executionCapabilities: profile.executionCapabilities,
        paperWidth: profile.paperWidth,
        arabicRenderingMode: profile.arabicRenderingMode ?? DEFAULT_ARABIC_RENDERING_MODE,
      }))
      .sort((left, right) => left.printerId.localeCompare(right.printerId))
  );
}

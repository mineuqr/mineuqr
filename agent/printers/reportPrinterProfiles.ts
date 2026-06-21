/**
 * THERMAL-PRINTING-7F.2 — agent printer inventory reporting (informational only).
 */
import {
  AGENT_PRINTER_PROFILE_MESSAGE_TYPES,
  DEFAULT_AGENT_PRINTER_PROFILE_PROTOCOL_VERSION,
  fingerprintPrinterProfilesInventory,
  validateAgentPrinterProfilesReportPayload,
  type AgentPrinterProfilesReportMessage,
  type PrinterProfile,
} from "../../shared/printing/printerProfiles";

export type PrinterProfilesReportPayload = {
  agentId: string;
  timestamp: string;
  printers: PrinterProfile[];
};

export type PrinterProfilesReportSender = {
  send(data: string): void;
};

export class PrinterProfilesReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrinterProfilesReportError";
  }
}

export function buildPrinterProfilesReportMessage(
  payload: PrinterProfilesReportPayload
): AgentPrinterProfilesReportMessage {
  const validated = validateAgentPrinterProfilesReportPayload(payload);

  return {
    type: AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT,
    protocolVersion: DEFAULT_AGENT_PRINTER_PROFILE_PROTOCOL_VERSION,
    agentId: validated.agentId,
    timestamp: validated.timestamp,
    printers: validated.printers,
  };
}

export class PrinterProfilesReportTracker {
  private lastFingerprint: string | undefined;

  hasReportedInventory(profiles: readonly PrinterProfile[]): boolean {
    if (!this.lastFingerprint) {
      return false;
    }

    return this.lastFingerprint === fingerprintPrinterProfilesInventory(profiles);
  }

  markReported(profiles: readonly PrinterProfile[]): void {
    this.lastFingerprint = fingerprintPrinterProfilesInventory(profiles);
  }

  clear(): void {
    this.lastFingerprint = undefined;
  }
}

export function reportPrinterProfiles(input: {
  payload: PrinterProfilesReportPayload;
  sender: PrinterProfilesReportSender;
  tracker: PrinterProfilesReportTracker;
}): boolean {
  if (input.tracker.hasReportedInventory(input.payload.printers)) {
    return false;
  }

  const message = buildPrinterProfilesReportMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markReported(message.printers);
  return true;
}

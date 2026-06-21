/**
 * THERMAL-PRINTING-7F.3 — printer profile inventory receiver (informational only).
 */
import {
  validateAgentPrinterProfilesReportPayload,
  type PrinterProfile,
} from "../../shared/printing/printerProfiles";
import { getAgent } from "./agentRegistry";
import {
  replaceAgentPrinterInventory,
  type AgentPrinterInventoryRecord,
} from "./printerProfileStore";

export type RecordPrinterProfilesReportInput = {
  agentId: string;
  timestamp: string;
  printers: PrinterProfile[];
};

export type RecordPrinterProfilesReportResult =
  | { accepted: true; duplicate: false; record: AgentPrinterInventoryRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterInventoryRecord }
  | { accepted: false; reason: string };

export function recordPrinterProfilesReport(
  input: RecordPrinterProfilesReportInput
): RecordPrinterProfilesReportResult {
  try {
    const payload = validateAgentPrinterProfilesReportPayload({
      agentId: input.agentId,
      timestamp: input.timestamp,
      printers: input.printers,
    });

    const agent = getAgent(payload.agentId);
    if (!agent) {
      return { accepted: false, reason: "Agent not registered" };
    }

    return replaceAgentPrinterInventory({
      agentId: payload.agentId,
      timestamp: payload.timestamp,
      profiles: payload.printers,
    });
  } catch (error) {
    return {
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

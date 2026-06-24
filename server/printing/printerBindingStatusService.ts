/**
 * THERMAL-PRINTING-13I.3A — printer binding status report ingestion.
 */
import { getAgent } from "./agentRegistry";
import {
  replaceAgentPrinterBindingStatus,
  type AgentPrinterBindingStatusRecord,
} from "./printerBindingStatusStore";
import type { AgentPrinterBindingReportItem } from "../../shared/printing/printerBindingReport";
import { validateAgentPrinterBindingReportPayload } from "../../shared/printing/printerBindingReport";

export type RecordPrinterBindingStatusReportInput = {
  agentId: string;
  timestamp: string;
  bindings: AgentPrinterBindingReportItem[];
};

export type RecordPrinterBindingStatusReportResult =
  | { accepted: true; duplicate: false; record: AgentPrinterBindingStatusRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterBindingStatusRecord }
  | { accepted: false; reason: string };

export function recordPrinterBindingStatusReport(
  input: RecordPrinterBindingStatusReportInput
): RecordPrinterBindingStatusReportResult {
  try {
    const payload = validateAgentPrinterBindingReportPayload({
      agentId: input.agentId,
      timestamp: input.timestamp,
      bindings: input.bindings,
    });

    const agent = getAgent(payload.agentId);
    if (!agent) {
      return { accepted: false, reason: "Agent not registered" };
    }

    return replaceAgentPrinterBindingStatus({
      agentId: payload.agentId,
      timestamp: payload.timestamp,
      bindings: payload.bindings,
    });
  } catch (error) {
    return {
      accepted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

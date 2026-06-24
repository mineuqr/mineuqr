/**
 * THERMAL-PRINTING-13I.3A — printer binding status negotiation orchestration.
 */
import {
  recordPrinterBindingStatusReport,
  type RecordPrinterBindingStatusReportInput,
} from "./printerBindingStatusService";
import type { AgentPrinterBindingStatusRecord } from "./printerBindingStatusStore";

export type ProcessAgentPrinterBindingStatusReportResult =
  | { accepted: true; duplicate: false; record: AgentPrinterBindingStatusRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterBindingStatusRecord }
  | { accepted: false; reason: string };

export function processAgentPrinterBindingStatusReport(
  input: RecordPrinterBindingStatusReportInput
): ProcessAgentPrinterBindingStatusReportResult {
  return recordPrinterBindingStatusReport(input);
}

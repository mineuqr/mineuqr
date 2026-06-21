/**
 * THERMAL-PRINTING-7F.6 — printer profile negotiation orchestration.
 */
import { recordPrinterProfilesReport, type RecordPrinterProfilesReportInput } from "./printerProfileService";
import type { AgentPrinterInventoryRecord } from "./printerProfileStore";

export type ProcessAgentPrinterProfilesReportResult =
  | { accepted: true; duplicate: false; record: AgentPrinterInventoryRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterInventoryRecord }
  | { accepted: false; reason: string };

export function processAgentPrinterProfilesReport(
  input: RecordPrinterProfilesReportInput
): ProcessAgentPrinterProfilesReportResult {
  return recordPrinterProfilesReport(input);
}

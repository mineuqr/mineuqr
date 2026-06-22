/**
 * THERMAL-PRINTING-7F.6 / 12E.2B — printer profile negotiation orchestration.
 */
import { recordPrinterProfilesReport, type RecordPrinterProfilesReportInput } from "./printerProfileService";
import { syncAgentEndpointOnPrinterProfilesReport } from "./endpointProjectionService";
import type { AgentPrinterInventoryRecord } from "./printerProfileStore";

export type ProcessAgentPrinterProfilesReportResult =
  | { accepted: true; duplicate: false; record: AgentPrinterInventoryRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterInventoryRecord }
  | { accepted: false; reason: string };

export function processAgentPrinterProfilesReport(
  input: RecordPrinterProfilesReportInput
): ProcessAgentPrinterProfilesReportResult {
  const result = recordPrinterProfilesReport(input);
  if (result.accepted) {
    syncAgentEndpointOnPrinterProfilesReport(input.agentId);
  }
  return result;
}

/**
 * THERMAL-PRINTING-13I.3A — latest-known printer binding status store (Print Host).
 */
import type { AgentPrinterBindingReportItem } from "../../shared/printing/printerBindingReport";
import { fingerprintPrinterBindingReportInventory } from "../../shared/printing/printerBindingReport";

export type AgentPrinterBindingStatusRecord = {
  agentId: string;
  bindings: AgentPrinterBindingReportItem[];
  timestamp: string;
  updatedAt: string;
};

export type ReplaceAgentPrinterBindingStatusInput = {
  agentId: string;
  bindings: AgentPrinterBindingReportItem[];
  timestamp: string;
};

export type ReplaceAgentPrinterBindingStatusResult =
  | { accepted: true; duplicate: false; record: AgentPrinterBindingStatusRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterBindingStatusRecord };

const bindingReports = new Map<string, AgentPrinterBindingStatusRecord>();

function isDuplicateReport(
  existing: AgentPrinterBindingStatusRecord | undefined,
  incoming: ReplaceAgentPrinterBindingStatusInput
): boolean {
  if (!existing) {
    return false;
  }

  return (
    existing.timestamp === incoming.timestamp &&
    fingerprintPrinterBindingReportInventory(existing.bindings) ===
      fingerprintPrinterBindingReportInventory(incoming.bindings)
  );
}

function isIncomingLatest(
  existing: AgentPrinterBindingStatusRecord | undefined,
  incomingTimestamp: string
): boolean {
  if (!existing) {
    return true;
  }

  return incomingTimestamp >= existing.timestamp;
}

export function getStoredAgentPrinterBindingStatus(
  agentId: string
): AgentPrinterBindingStatusRecord | undefined {
  return bindingReports.get(agentId.trim());
}

export function getStoredPrinterBindingStatus(
  agentId: string,
  profileId: string
): AgentPrinterBindingReportItem | undefined {
  const record = getStoredAgentPrinterBindingStatus(agentId);
  if (!record) {
    return undefined;
  }

  const normalizedProfileId = profileId.trim();
  return record.bindings.find((binding) => binding.profileId === normalizedProfileId);
}

export function clearPrinterBindingStatusStore(): void {
  bindingReports.clear();
}

export function replaceAgentPrinterBindingStatus(
  input: ReplaceAgentPrinterBindingStatusInput,
  updatedAt: string = new Date().toISOString()
): ReplaceAgentPrinterBindingStatusResult {
  const normalizedAgentId = input.agentId.trim();
  const existing = bindingReports.get(normalizedAgentId);

  if (isDuplicateReport(existing, input)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  if (!isIncomingLatest(existing, input.timestamp)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  const record: AgentPrinterBindingStatusRecord = {
    agentId: normalizedAgentId,
    bindings: input.bindings.map((binding) => ({ ...binding })),
    timestamp: input.timestamp,
    updatedAt,
  };
  bindingReports.set(normalizedAgentId, record);

  return { accepted: true, duplicate: false, record };
}

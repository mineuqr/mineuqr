/**
 * THERMAL-PRINTING-7F.4 — latest-known printer inventory store (informational only).
 */
import {
  fingerprintPrinterProfilesInventory,
  type PrinterProfile,
} from "../../shared/printing/printerProfiles";

export type AgentPrinterInventoryRecord = {
  agentId: string;
  profiles: PrinterProfile[];
  timestamp: string;
  updatedAt: string;
};

export type ReplaceAgentPrinterInventoryInput = {
  agentId: string;
  profiles: PrinterProfile[];
  timestamp: string;
};

export type ReplaceAgentPrinterInventoryResult =
  | { accepted: true; duplicate: false; record: AgentPrinterInventoryRecord }
  | { accepted: true; duplicate: true; record: AgentPrinterInventoryRecord };

const inventories = new Map<string, AgentPrinterInventoryRecord>();

function isDuplicateInventory(
  existing: AgentPrinterInventoryRecord | undefined,
  incoming: ReplaceAgentPrinterInventoryInput
): boolean {
  if (!existing) {
    return false;
  }

  return (
    existing.timestamp === incoming.timestamp &&
    fingerprintPrinterProfilesInventory(existing.profiles) ===
      fingerprintPrinterProfilesInventory(incoming.profiles)
  );
}

function isIncomingLatest(
  existing: AgentPrinterInventoryRecord | undefined,
  incomingTimestamp: string
): boolean {
  if (!existing) {
    return true;
  }

  return incomingTimestamp >= existing.timestamp;
}

export function getStoredAgentPrinterInventory(
  agentId: string
): AgentPrinterInventoryRecord | undefined {
  return inventories.get(agentId.trim());
}

export function getStoredPrinterProfile(
  agentId: string,
  printerId: string
): PrinterProfile | undefined {
  const inventory = getStoredAgentPrinterInventory(agentId);
  if (!inventory) {
    return undefined;
  }

  const normalizedPrinterId = printerId.trim();
  return inventory.profiles.find((profile) => profile.printerId === normalizedPrinterId);
}

export function clearPrinterProfileStore(): void {
  inventories.clear();
}

export function replaceAgentPrinterInventory(
  input: ReplaceAgentPrinterInventoryInput,
  updatedAt: string = new Date().toISOString()
): ReplaceAgentPrinterInventoryResult {
  const normalizedAgentId = input.agentId.trim();
  const existing = inventories.get(normalizedAgentId);

  if (isDuplicateInventory(existing, input)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  if (!isIncomingLatest(existing, input.timestamp)) {
    return { accepted: true, duplicate: true, record: existing! };
  }

  const record: AgentPrinterInventoryRecord = {
    agentId: normalizedAgentId,
    profiles: input.profiles.map((profile) => ({
      ...profile,
      capabilities: { ...profile.capabilities },
    })),
    timestamp: input.timestamp,
    updatedAt,
  };
  inventories.set(normalizedAgentId, record);

  return { accepted: true, duplicate: false, record };
}

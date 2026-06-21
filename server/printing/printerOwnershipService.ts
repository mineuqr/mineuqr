/**
 * THERMAL-PRINTING-8A.2 — printer ownership lookup (registry + profile store).
 */
import { listAgents } from "./agentRegistry";
import { getStoredPrinterProfile } from "./printerProfileStore";

export function toPrinterOwnershipKey(printerId: number | string): string {
  if (typeof printerId === "number") {
    if (!Number.isInteger(printerId) || printerId <= 0) {
      throw new Error("Invalid printerId");
    }
    return String(printerId);
  }

  const trimmed = printerId.trim();
  if (!trimmed) {
    throw new Error("Invalid printerId");
  }
  return trimmed;
}

export function listPrinterOwnerAgentIds(printerId: string): string[] {
  const normalizedPrinterId = toPrinterOwnershipKey(printerId);
  const owners: string[] = [];

  for (const agent of listAgents()) {
    const agentId = agent.registration.identity.agentId;
    if (getStoredPrinterProfile(agentId, normalizedPrinterId)) {
      owners.push(agentId);
    }
  }

  return owners.sort((left, right) => left.localeCompare(right));
}

export function getPrinterOwner(printerId: string): string | undefined {
  return listPrinterOwnerAgentIds(printerId)[0];
}

export function isPrinterKnownToInventory(printerId: string): boolean {
  return listPrinterOwnerAgentIds(printerId).length > 0;
}

export function validatePrinterOwnership(printerId: string, agentId: string): boolean {
  const owner = getPrinterOwner(printerId);
  if (!owner) {
    return false;
  }

  return owner === agentId.trim();
}

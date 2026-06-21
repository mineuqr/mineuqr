/**
 * THERMAL-PRINTING-8A.2 — profile printer ownership lookup (informational profiles only).
 */
import { listProfilePrinterOwnerAgentIds } from "./resolutionConflictService";

export function listPrinterOwnerAgentIds(profilePrinterId: string): string[] {
  return listProfilePrinterOwnerAgentIds(profilePrinterId);
}

export function getPrinterOwner(profilePrinterId: string): string | undefined {
  const owners = listProfilePrinterOwnerAgentIds(profilePrinterId);
  return owners[0];
}

export function isPrinterKnownToInventory(profilePrinterId: string): boolean {
  return listProfilePrinterOwnerAgentIds(profilePrinterId).length > 0;
}

export function validatePrinterOwnership(
  profilePrinterId: string,
  agentId: string
): boolean {
  const owners = listProfilePrinterOwnerAgentIds(profilePrinterId);
  return owners.length === 1 && owners[0] === agentId.trim();
}

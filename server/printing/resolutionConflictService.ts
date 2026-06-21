/**
 * THERMAL-PRINTING-8B.6 — ambiguous profile printer ownership detection.
 */
import { listAgents } from "./agentRegistry";
import { getStoredPrinterProfile } from "./printerProfileStore";

export type ProfilePrinterOwnershipConflictResult =
  | { conflict: false; agentId: string }
  | { conflict: false; agentId: undefined }
  | { conflict: true; agentIds: string[] };

function normalizeProfilePrinterId(profilePrinterId: string): string {
  return profilePrinterId.trim();
}

export function listProfilePrinterOwnerAgentIds(profilePrinterId: string): string[] {
  const normalizedProfilePrinterId = normalizeProfilePrinterId(profilePrinterId);
  if (!normalizedProfilePrinterId) {
    return [];
  }

  const owners: string[] = [];
  for (const agent of listAgents()) {
    const agentId = agent.registration.identity.agentId;
    if (getStoredPrinterProfile(agentId, normalizedProfilePrinterId)) {
      owners.push(agentId);
    }
  }

  return owners.sort((left, right) => left.localeCompare(right));
}

export function detectProfilePrinterOwnershipConflict(
  profilePrinterId: string
): ProfilePrinterOwnershipConflictResult {
  const owners = listProfilePrinterOwnerAgentIds(profilePrinterId);

  if (owners.length === 0) {
    return { conflict: false, agentId: undefined };
  }
  if (owners.length === 1) {
    return { conflict: false, agentId: owners[0]! };
  }

  return { conflict: true, agentIds: owners };
}

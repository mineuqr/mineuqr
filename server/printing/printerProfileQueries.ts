/**
 * THERMAL-PRINTING-7F.5 — read-only printer profile queries.
 */
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import {
  getStoredAgentPrinterInventory,
  getStoredPrinterProfile,
  type AgentPrinterInventoryRecord,
} from "./printerProfileStore";

export function getAgentPrinterProfiles(
  agentId: string
): AgentPrinterInventoryRecord | undefined {
  return getStoredAgentPrinterInventory(agentId);
}

export function getPrinterProfile(
  agentId: string,
  printerId: string
): PrinterProfile | undefined {
  return getStoredPrinterProfile(agentId, printerId);
}

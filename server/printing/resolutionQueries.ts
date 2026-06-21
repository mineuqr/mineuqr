/**
 * THERMAL-PRINTING-8B.5 — read-only printer resolution queries.
 */
import { listDbPrinterProfileMappings } from "./printerResolutionRegistry";
import { resolvePrinter } from "./printerResolutionService";
import type { PrinterResolution } from "./resolutionTypes";

export function getPrinterResolution(dbPrinterId: number): PrinterResolution | undefined {
  try {
    return resolvePrinter(dbPrinterId);
  } catch {
    return undefined;
  }
}

export function getAgentResolvedPrinters(agentId: string): PrinterResolution[] {
  const normalizedAgentId = agentId.trim();
  const resolved: PrinterResolution[] = [];

  for (const mapping of listDbPrinterProfileMappings()) {
    const resolution = getPrinterResolution(mapping.dbPrinterId);
    if (resolution?.agentId === normalizedAgentId) {
      resolved.push(resolution);
    }
  }

  return resolved.sort((left, right) => left.dbPrinterId - right.dbPrinterId);
}

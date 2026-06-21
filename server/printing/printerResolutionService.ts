/**
 * THERMAL-PRINTING-8B.3 — printer resolution engine (Resolution ≠ Routing).
 */
import { detectProfilePrinterOwnershipConflict } from "./resolutionConflictService";
import { getDbPrinterProfileMapping } from "./printerResolutionRegistry";
import {
  ResolutionRejectedError,
  RESOLUTION_FAILURE_CODES,
  type PrinterResolution,
} from "./resolutionTypes";

export function resolvePrinter(dbPrinterId: number): PrinterResolution {
  if (!Number.isInteger(dbPrinterId) || dbPrinterId <= 0) {
    throw new ResolutionRejectedError(
      RESOLUTION_FAILURE_CODES.INVALID_INPUT,
      "Invalid dbPrinterId"
    );
  }

  const mapping = getDbPrinterProfileMapping(dbPrinterId);
  if (!mapping) {
    throw new ResolutionRejectedError(
      RESOLUTION_FAILURE_CODES.UNKNOWN_DB_PRINTER,
      "Unknown database printer"
    );
  }

  const ownership = detectProfilePrinterOwnershipConflict(mapping.profilePrinterId);
  if (ownership.conflict) {
    throw new ResolutionRejectedError(
      RESOLUTION_FAILURE_CODES.RESOLUTION_CONFLICT,
      "Conflicting printer ownership detected"
    );
  }
  if (!ownership.agentId) {
    throw new ResolutionRejectedError(
      RESOLUTION_FAILURE_CODES.UNKNOWN_PROFILE,
      "Unknown profile printer"
    );
  }

  return {
    dbPrinterId,
    profilePrinterId: mapping.profilePrinterId,
    agentId: ownership.agentId,
  };
}

/**
 * THERMAL-PRINTING-8B.2 — canonical dbPrinterId → profilePrinterId mappings.
 */
import {
  ResolutionRejectedError,
  RESOLUTION_FAILURE_CODES,
  type DbPrinterProfileMapping,
  type RegisterDbPrinterProfileMappingInput,
} from "./resolutionTypes";

const dbPrinterProfileMappings = new Map<number, DbPrinterProfileMapping>();

function normalizeProfilePrinterId(profilePrinterId: string): string {
  const trimmed = profilePrinterId.trim();
  if (!trimmed) {
    throw new ResolutionRejectedError(
      RESOLUTION_FAILURE_CODES.INVALID_INPUT,
      "profilePrinterId is required"
    );
  }
  return trimmed;
}

export function registerDbPrinterProfileMapping(
  input: RegisterDbPrinterProfileMappingInput
): DbPrinterProfileMapping {
  if (!Number.isInteger(input.dbPrinterId) || input.dbPrinterId <= 0) {
    throw new ResolutionRejectedError(
      RESOLUTION_FAILURE_CODES.INVALID_INPUT,
      "Invalid dbPrinterId"
    );
  }

  const mapping: DbPrinterProfileMapping = {
    dbPrinterId: input.dbPrinterId,
    profilePrinterId: normalizeProfilePrinterId(input.profilePrinterId),
  };

  dbPrinterProfileMappings.set(mapping.dbPrinterId, mapping);
  return mapping;
}

export function getDbPrinterProfileMapping(
  dbPrinterId: number
): DbPrinterProfileMapping | undefined {
  return dbPrinterProfileMappings.get(dbPrinterId);
}

export function listDbPrinterProfileMappings(): DbPrinterProfileMapping[] {
  return Array.from(dbPrinterProfileMappings.values()).sort(
    (left, right) => left.dbPrinterId - right.dbPrinterId
  );
}

export function clearPrinterResolutionRegistry(): void {
  dbPrinterProfileMappings.clear();
}

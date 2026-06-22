/**
 * THERMAL-PRINTING-11B — DB-backed printer resolution registry synchronization.
 */
import { findPrinterById, listAllPrinters } from "./printerRepository";
import {
  clearPrinterResolutionRegistry,
  registerDbPrinterProfileMapping,
} from "./printerResolutionRegistry";
import type { DbPrinterProfileMapping } from "./resolutionTypes";

export type PrinterResolutionRegistryRebuildResult = {
  rebuilt: number;
  mappings: DbPrinterProfileMapping[];
};

function mappingFromPrinterRow(printer: {
  id: number;
  profileId: string;
}): DbPrinterProfileMapping | null {
  const profilePrinterId = printer.profileId.trim();
  if (!profilePrinterId) {
    return null;
  }

  return registerDbPrinterProfileMapping({
    dbPrinterId: printer.id,
    profilePrinterId,
  });
}

export async function rebuildPrinterResolutionRegistryFromDb(): Promise<PrinterResolutionRegistryRebuildResult> {
  clearPrinterResolutionRegistry();

  const printerRows = await listAllPrinters();
  const mappings: DbPrinterProfileMapping[] = [];

  for (const printer of printerRows) {
    const mapping = mappingFromPrinterRow(printer);
    if (mapping) {
      mappings.push(mapping);
    }
  }

  return {
    rebuilt: mappings.length,
    mappings,
  };
}

export async function syncDbPrinterProfileMappingFromDb(
  dbPrinterId: number
): Promise<DbPrinterProfileMapping | null> {
  const printer = await findPrinterById(dbPrinterId);
  if (!printer) {
    return null;
  }

  return mappingFromPrinterRow(printer);
}

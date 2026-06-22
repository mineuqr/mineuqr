/**
 * THERMAL-PRINTING-11B — printing runtime initialization (registry rebuild from DB).
 */
import { rebuildPrinterResolutionRegistryFromDb } from "./printerResolutionPersistenceService";

let initializationPromise: Promise<void> | null = null;

export async function initializePrintingRuntime(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        const result = await rebuildPrinterResolutionRegistryFromDb();
        console.log(
          `[Printing] Rebuilt printer resolution registry (${result.rebuilt} mapping(s))`
        );
      } catch (error) {
        console.warn(
          "[Printing] Failed to rebuild printer resolution registry:",
          error instanceof Error ? error.message : String(error)
        );
      }
    })();
  }

  await initializationPromise;
}

export function resetPrintingRuntimeInitializationForTests(): void {
  initializationPromise = null;
}

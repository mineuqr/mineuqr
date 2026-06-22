/**
 * THERMAL-PRINTING-11B — verify DB-backed printer resolution registry rebuild.
 */
import "dotenv/config";
import { clearPrinterResolutionRegistry } from "../server/printing/printerResolutionRegistry";
import { rebuildPrinterResolutionRegistryFromDb } from "../server/printing/printerResolutionPersistenceService";
import { getDbPrinterProfileMapping } from "../server/printing/printerResolutionRegistry";
import { resolvePrinter } from "../server/printing/printerResolutionService";
import { clearAgentRegistry } from "../server/printing/agentRegistry";
import { clearPrinterProfileStore } from "../server/printing/printerProfileStore";

async function main() {
  console.log("=== THERMAL-PRINTING-11B VERIFICATION ===");

  clearPrinterResolutionRegistry();
  clearAgentRegistry();
  clearPrinterProfileStore();

  console.log("Simulating server restart: registry cleared");

  const rebuild = await rebuildPrinterResolutionRegistryFromDb();
  console.log(
    JSON.stringify(
      {
        rebuilt: rebuild.rebuilt,
        mappings: rebuild.mappings,
      },
      null,
      2
    )
  );

  const firstMapping = rebuild.mappings[0];
  if (!firstMapping) {
    throw new Error("No printer mappings rebuilt from DB");
  }

  const cached = getDbPrinterProfileMapping(firstMapping.dbPrinterId);
  console.log("\nCached mapping after rebuild:");
  console.log(JSON.stringify(cached, null, 2));

  let resolutionError: string | null = null;
  try {
    resolvePrinter(firstMapping.dbPrinterId);
  } catch (error) {
    resolutionError = error instanceof Error ? error.message : String(error);
  }

  console.log("\nResolution without connected agent (expected UNKNOWN_PROFILE until agent reports):");
  console.log(resolutionError ?? "unexpected success");

  const passed =
    rebuild.rebuilt > 0 &&
    cached?.profilePrinterId === firstMapping.profilePrinterId &&
    resolutionError != null &&
    resolutionError.includes("Unknown profile");

  console.log("\n=== VERDICT ===");
  console.log(passed ? "THERMAL-PRINTING-11B VERIFICATION PASSED" : "THERMAL-PRINTING-11B VERIFICATION FAILED");

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[thermal-printing-11b] fatal:", error);
  process.exit(1);
});

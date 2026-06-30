#!/usr/bin/env tsx
/**
 * ADR-ARCH-017 M-1 — one-time migration: print_connector_selections → restaurant_printers
 */
import "dotenv/config";
import { DrizzleRestaurantPrinterRepository } from "../server/printer-management/infrastructure/DrizzleRestaurantPrinterRepository";
import { LegacyPrinterSelectionMigrator } from "../server/printer-management/infrastructure/LegacyPrinterSelectionMigrator";

async function main() {
  const migrator = new LegacyPrinterSelectionMigrator(new DrizzleRestaurantPrinterRepository());
  const result = await migrator.migrate();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

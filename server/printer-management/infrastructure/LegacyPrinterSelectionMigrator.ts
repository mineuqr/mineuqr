import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { printConnectorSelections, restaurantPrinters } from "../../../drizzle/schema";
import type { RestaurantPrinterRepository } from "../contracts/RestaurantPrinterRepository";

export type LegacyPrinterSelectionMigrationResult = {
  scanned: number;
  migrated: number;
  skipped: number;
};

/**
 * ADR-ARCH-017 M-1 — one-time migration from print_connector_selections to restaurant_printers.
 * Does not reactivate soft-deleted catalog rows.
 */
export class LegacyPrinterSelectionMigrator {
  constructor(private readonly catalog: RestaurantPrinterRepository) {}

  async migrate(): Promise<LegacyPrinterSelectionMigrationResult> {
    const db = await getDb();
    if (!db) {
      return { scanned: 0, migrated: 0, skipped: 0 };
    }

    const legacyRows = await db.select().from(printConnectorSelections);
    let migrated = 0;
    let skipped = 0;

    for (const legacy of legacyRows) {
      const activeDefault = await this.catalog.getDefault(legacy.restaurantId);
      if (activeDefault) {
        skipped += 1;
        continue;
      }

      const [inactiveRow] = await db
        .select()
        .from(restaurantPrinters)
        .where(
          and(
            eq(restaurantPrinters.restaurantId, legacy.restaurantId),
            eq(restaurantPrinters.printerId, legacy.printerId),
            eq(restaurantPrinters.isActive, false)
          )
        )
        .limit(1);

      if (inactiveRow) {
        skipped += 1;
        continue;
      }

      await this.catalog.save({
        restaurantId: legacy.restaurantId,
        printerId: legacy.printerId,
        displayName: legacy.printerName,
        platform: legacy.platform,
        transport: legacy.transport,
        isDefault: true,
      });
      migrated += 1;
    }

    return { scanned: legacyRows.length, migrated, skipped };
  }
}

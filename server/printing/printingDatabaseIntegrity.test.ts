/**
 * THERMAL-PRINTING-13I.4D — optional live-database constraint verification.
 *
 * Run with: RUN_PRINTING_DB_INTEGRITY_TESTS=1 npx vitest run server/printing/printingDatabaseIntegrity.test.ts
 */
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { isMysqlDuplicateKeyError } from "./printJobTypes";
import { insertPrinterForRestaurant } from "./printerRepository";

const runLive = process.env.RUN_PRINTING_DB_INTEGRITY_TESTS === "1";

describe.skipIf(!runLive)("printingDatabaseIntegrity THERMAL-PRINTING-13I.4D", () => {
  it("rejects duplicate (restaurantId, profileId) on printers", async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const [rows] = await db.execute(
      sql`SELECT restaurantId FROM printers ORDER BY id LIMIT 1`
    );
    const sample = (rows as Array<{ restaurantId: number }>)[0];
    if (!sample) {
      return;
    }

    const profileId = `integrity-test-${Date.now()}`;
    const first = await insertPrinterForRestaurant({
      restaurantId: sample.restaurantId,
      name: "Integrity Test Printer A",
      paperWidthMm: 80,
      profileId,
      isDefault: false,
    });

    try {
      await expect(
        insertPrinterForRestaurant({
          restaurantId: sample.restaurantId,
          name: "Integrity Test Printer B",
          paperWidthMm: 80,
          profileId,
          isDefault: false,
        })
      ).rejects.toSatisfy((error: unknown) => isMysqlDuplicateKeyError(error));
    } finally {
      await db.execute(sql`DELETE FROM printers WHERE id = ${first.id}`);
    }
  });
});

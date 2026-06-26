/**
 * THERMAL-PRINTING-13I.4D — verify Tier 1 constraints exist in database.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const EXPECTED = {
  uniqueIndexes: ["printers_restaurant_id_profile_id_unique"],
  foreignKeys: [
    "print_jobs_printer_id_fk",
    "print_jobs_order_id_fk",
    "print_job_attempts_print_job_id_fk",
    "print_job_telemetry_events_print_job_id_fk",
  ],
};

async function main(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [indexes] = await db.execute(sql`
    SELECT INDEX_NAME, TABLE_NAME, NON_UNIQUE
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND INDEX_NAME IN (${sql.join(
        EXPECTED.uniqueIndexes.map((name) => sql`${name}`),
        sql`, `
      )})
  `);

  const [foreignKeys] = await db.execute(sql`
    SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME IN (${sql.join(
        EXPECTED.foreignKeys.map((name) => sql`${name}`),
        sql`, `
      )})
  `);

  console.log("=== unique_indexes ===");
  console.log(JSON.stringify(indexes, null, 2));
  console.log("=== foreign_keys ===");
  console.log(JSON.stringify(foreignKeys, null, 2));

  const indexNames = new Set(
    (indexes as Array<{ INDEX_NAME: string }>).map((row) => row.INDEX_NAME)
  );
  const fkNames = new Set(
    (foreignKeys as Array<{ CONSTRAINT_NAME: string }>).map((row) => row.CONSTRAINT_NAME)
  );

  const missingIndexes = EXPECTED.uniqueIndexes.filter((name) => !indexNames.has(name));
  const missingFks = EXPECTED.foreignKeys.filter((name) => !fkNames.has(name));

  if (missingIndexes.length > 0 || missingFks.length > 0) {
    console.error("Missing constraints:", { missingIndexes, missingFks });
    process.exit(1);
  }

  console.log("All Tier 1 constraints present.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

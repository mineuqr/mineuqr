/**
 * THERMAL-PRINTING-13I.4D — pre-flight database integrity audit (read-only).
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function runQuery<T>(label: string, query: ReturnType<typeof sql>): Promise<T[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const result = await db.execute(query);
  const rows = Array.isArray(result) ? result[0] : result;
  const normalized = rows as T[];
  console.log(`=== ${label} ===`);
  console.log(JSON.stringify(normalized, null, 2));
  return normalized;
}

async function main(): Promise<void> {
  const duplicates = await runQuery<{ restaurantId: number; profileId: string; cnt: number }>(
    "duplicate_profiles",
    sql`
      SELECT restaurantId, profileId, COUNT(*) AS cnt
      FROM printers
      GROUP BY restaurantId, profileId
      HAVING cnt > 1
    `
  );

  const orphanPrinters = await runQuery<{ id: number; printerId: number; restaurantId: number }>(
    "orphan_printer_refs",
    sql`
      SELECT pj.id, pj.printerId, pj.restaurantId
      FROM print_jobs pj
      LEFT JOIN printers p ON pj.printerId = p.id
      WHERE pj.printerId IS NOT NULL AND p.id IS NULL
    `
  );

  const orphanOrders = await runQuery<{ id: number; orderId: number; restaurantId: number }>(
    "orphan_order_refs",
    sql`
      SELECT pj.id, pj.orderId, pj.restaurantId
      FROM print_jobs pj
      LEFT JOIN orders o ON pj.orderId = o.id
      WHERE o.id IS NULL
    `
  );

  const orphanAttempts = await runQuery<{ id: number; printJobId: number }>(
    "orphan_attempts",
    sql`
      SELECT pja.id, pja.printJobId
      FROM print_job_attempts pja
      LEFT JOIN print_jobs pj ON pja.printJobId = pj.id
      WHERE pj.id IS NULL
    `
  );

  const orphanTelemetry = await runQuery<{ id: number; printJobId: number }>(
    "orphan_telemetry",
    sql`
      SELECT pjt.id, pjt.printJobId
      FROM print_job_telemetry_events pjt
      LEFT JOIN print_jobs pj ON pjt.printJobId = pj.id
      WHERE pj.id IS NULL
    `
  );

  await runQuery<{ cnt: number }>(
    "null_printer_jobs",
    sql`SELECT COUNT(*) AS cnt FROM print_jobs WHERE printerId IS NULL`
  );
  await runQuery<{ cnt: number }>("total_printers", sql`SELECT COUNT(*) AS cnt FROM printers`);
  await runQuery<{ cnt: number }>("total_jobs", sql`SELECT COUNT(*) AS cnt FROM print_jobs`);
  await runQuery<{ cnt: number }>(
    "total_attempts",
    sql`SELECT COUNT(*) AS cnt FROM print_job_attempts`
  );
  await runQuery<{ cnt: number }>(
    "total_telemetry",
    sql`SELECT COUNT(*) AS cnt FROM print_job_telemetry_events`
  );

  const violations =
    duplicates.length > 0 ||
    orphanPrinters.length > 0 ||
    orphanOrders.length > 0 ||
    orphanAttempts.length > 0 ||
    orphanTelemetry.length > 0;

  console.log("\n=== READINESS ===");
  console.log(violations ? "BLOCKED: violations found" : "READY: no violations");

  process.exit(violations ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

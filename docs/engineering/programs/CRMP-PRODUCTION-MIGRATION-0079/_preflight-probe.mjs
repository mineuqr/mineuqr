/**
 * CRMP-PRODUCTION-MIGRATION-0079 — read-only production pre/post probes.
 * Does not apply DDL. Uses audit readonly connection.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const MODE = process.argv[2] || "pre";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const sqlFile = readFileSync(
    new URL("../../../../drizzle/0079_crmp_register_duty.sql", import.meta.url)
  );
  const hash0079 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0079]
    );
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'crmp_registers'
         AND COLUMN_NAME IN ('status','dutyStatus','assignedOperatorUserId','operatorAssignedAt','deviceId')
       ORDER BY ORDINAL_POSITION`
    );
    const [indexes] = await conn.query(
      `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'crmp_registers'
         AND INDEX_NAME = 'crmp_registers_restaurant_duty'
       ORDER BY SEQ_IN_INDEX`
    );
    const [counts] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM crmp_registers) AS registers,
         (SELECT COUNT(*) FROM crmp_financial_shifts) AS shifts,
         (SELECT COUNT(*) FROM crmp_drawer_movements) AS movements,
         (SELECT COUNT(*) FROM crmp_drawer_counts) AS counts,
         (SELECT COUNT(*) FROM crmp_shift_handovers) AS handovers,
         (SELECT COUNT(*) FROM crmp_settlement_attributions) AS attributions,
         (SELECT COUNT(*) FROM operational_checks) AS checks,
         (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
         (SELECT COUNT(*) FROM orders) AS orders`
    );

    console.log(
      JSON.stringify(
        {
          mode: MODE,
          hash0079,
          recentMigrations: mig,
          hash0079Applied: hashHit,
          crmpRegisterColumns: cols,
          restaurantDutyIndex: indexes,
          counts: counts[0],
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

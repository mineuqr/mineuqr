/**
 * CRMP-PRODUCTION-MIGRATION-0078 — read-only production pre/post probes.
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
    new URL("../../../../drizzle/0078_crmp_shift_lifecycle.sql", import.meta.url)
  );
  const hash0078 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0078]
    );
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'crmp_financial_shifts'
         AND COLUMN_NAME IN ('status','closeReason','archivedAt')
       ORDER BY ORDINAL_POSITION`
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
          hash0078,
          recentMigrations: mig,
          hash0078Applied: hashHit,
          crmpFinancialShiftColumns: cols,
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

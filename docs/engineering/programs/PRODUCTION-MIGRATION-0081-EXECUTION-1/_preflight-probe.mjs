/**
 * PRODUCTION-MIGRATION-0081-EXECUTION-1 — read-only production pre/post probes.
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
    new URL(
      "../../../../drizzle/0081_crmp_financial_shift_number.sql",
      import.meta.url
    )
  );
  const hash0081 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0081]
    );
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'crmp_financial_shifts'
         AND COLUMN_NAME IN (
           'id','financialShiftId','restaurantId','registerId',
           'shiftNumber','status','closedAt','archivedAt'
         )
       ORDER BY ORDINAL_POSITION`
    );
    const [indexes] = await conn.query(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'crmp_financial_shifts'
         AND INDEX_NAME IN (
           'crmp_financial_shifts_register_shift_number_unique',
           'crmp_financial_shifts_restaurant_closed',
           'crmp_financial_shifts_restaurant_status_closed'
         )
       GROUP BY INDEX_NAME, NON_UNIQUE
       ORDER BY INDEX_NAME`
    );
    const [seqTable] = await conn.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'crmp_register_shift_sequences'`
    );
    const [cnt] = await conn.query(
      "SELECT COUNT(*) AS n FROM crmp_financial_shifts"
    );
    const [nullUuid] = await conn.query(
      "SELECT COUNT(*) AS n FROM crmp_financial_shifts WHERE financialShiftId IS NULL OR financialShiftId = ''"
    );
    const [dupUuid] = await conn.query(
      `SELECT COUNT(*) AS n FROM (
         SELECT financialShiftId FROM crmp_financial_shifts
         GROUP BY financialShiftId HAVING COUNT(*) > 1
       ) t`
    );
    const [orph] = await conn.query(
      `SELECT COUNT(*) AS n
       FROM crmp_financial_shifts s
       LEFT JOIN crmp_registers r
         ON r.registerId = s.registerId AND r.restaurantId = s.restaurantId
       WHERE r.registerId IS NULL`
    );

    console.log(
      JSON.stringify(
        {
          mode: MODE,
          hash0081,
          lastMigrations: mig,
          hash0081Applied: hashHit,
          shiftNumberPresent: cols.some((c) => c.COLUMN_NAME === "shiftNumber"),
          columns: cols,
          targetIndexes: indexes,
          sequencesTablePresent: seqTable.length > 0,
          shiftRows: cnt[0].n,
          nullOrEmptyUuid: nullUuid[0].n,
          dupFinancialShiftId: dupUuid[0].n,
          orphanShiftsVsRegisters: orph[0].n,
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
  console.error("PROBE_FAIL", e.message);
  process.exit(1);
});

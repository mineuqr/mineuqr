/**
 * PRODUCTION-MIGRATION-0081-EXECUTION-1 — read-only DB smoke (no writes).
 */
import "dotenv/config";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const conn = await createAuditReadonlyConnection(url);
  try {
    const [registers] = await conn.query(
      `SELECT registerId, code, registerType, archivedAt
       FROM crmp_registers LIMIT 1`
    );
    const [shifts] = await conn.query(
      `SELECT financialShiftId, shiftNumber, restaurantId, registerId, status
       FROM crmp_financial_shifts
       ORDER BY id`
    );
    const [seqs] = await conn.query(
      `SELECT restaurantId, registerId, lastNumber
       FROM crmp_register_shift_sequences`
    );
    const [srs] = await conn.query(
      "SELECT settlementRecordId FROM settlement_records LIMIT 1"
    );
    const [checks] = await conn.query(
      "SELECT id FROM operational_checks LIMIT 1"
    );
    console.log(
      JSON.stringify({
        APP_DB_SMOKE: "OK",
        rows: {
          registers: registers.length,
          shifts: shifts.length,
          sequences: seqs.length,
          settlement_records: srs.length,
          operational_checks: checks.length,
        },
        shifts,
        sequences: seqs,
      })
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

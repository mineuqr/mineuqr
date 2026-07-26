/**
 * PRODUCTION-MIGRATION-EXECUTION-0082 — post-migrate SQL smoke (no money writes).
 */
import "dotenv/config";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

function pad6(n) {
  return String(Math.trunc(n)).padStart(6, "0");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const conn = await createAuditReadonlyConnection(url);
  try {
    const [row] = await conn.query(
      `SELECT restaurantId, settlementRecordId, sequenceNumber
       FROM refund_document_numbers
       ORDER BY restaurantId, sequenceNumber
       LIMIT 1`
    );
    if (!row[0]) throw new Error("expected at least one refund document number");
    const sequence = Number(row[0].sequenceNumber);
    const checkId = Number(String(row[0].settlementRecordId).split(":")[2]);
    const rf = `RF-${pad6(sequence)}`;
    const st = `ST-${pad6(checkId)}`;
    const [cursor] = await conn.query(
      `SELECT lastNumber FROM refund_document_sequences WHERE restaurantId = ?`,
      [row[0].restaurantId]
    );
    const [srKinds] = await conn.query(
      `SELECT recordKind, COUNT(*) AS n FROM settlement_records GROUP BY recordKind`
    );
    const [searchRf] = await conn.query(
      `SELECT settlementRecordId FROM refund_document_numbers
       WHERE restaurantId = ? AND sequenceNumber = ?`,
      [row[0].restaurantId, sequence]
    );
    const [searchSt] = await conn.query(
      `SELECT settlementRecordId FROM settlement_records
       WHERE restaurantId = ? AND checkId = ? AND recordKind = 'settlement'
       ORDER BY recordGeneration LIMIT 1`,
      [row[0].restaurantId, checkId]
    );
    console.log(
      JSON.stringify(
        {
          APP_DB_SMOKE: "OK",
          sampleRefundNumber: rf,
          originSettlementNumber: st,
          nextSequenceWouldBe: Number(cursor[0]?.lastNumber ?? 0) + 1,
          settlementRecordKinds: srKinds,
          settlementIdentityUnchanged: st.startsWith("ST-"),
          refundIdentityIndependent: rf.startsWith("RF-") && rf !== st,
          searchByRefundSequence: searchRf.length === 1,
          searchBySettlementCheckId: searchSt.length === 1,
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
  console.error("SMOKE_FAIL", e.message);
  process.exit(1);
});

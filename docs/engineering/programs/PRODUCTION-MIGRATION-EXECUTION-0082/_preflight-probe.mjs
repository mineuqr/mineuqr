/**
 * PRODUCTION-MIGRATION-EXECUTION-0082 — read-only production pre/post probes.
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
      "../../../../drizzle/0082_refund_document_numbering.sql",
      import.meta.url
    )
  );
  const hash0082 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [dbName] = await conn.query("SELECT DATABASE() AS db");
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0082]
    );
    const [tables] = await conn.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'refund_document_sequences',
           'refund_document_numbers'
         )
       ORDER BY TABLE_NAME`
    );
    const [indexes] = await conn.query(
      `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'refund_document_sequences',
           'refund_document_numbers'
         )
       GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
       ORDER BY TABLE_NAME, INDEX_NAME`
    );
    const [refundSr] = await conn.query(
      `SELECT COUNT(*) AS n FROM settlement_records WHERE recordKind = 'refund'`
    );
    const [settlementSr] = await conn.query(
      `SELECT COUNT(*) AS n FROM settlement_records WHERE recordKind = 'settlement'`
    );
    const [platformCounts] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
         (SELECT COUNT(*) FROM operational_checks) AS checks,
         (SELECT COUNT(*) FROM crmp_registers) AS registers,
         (SELECT COUNT(*) FROM crmp_settlement_attributions) AS attributions,
         (SELECT COUNT(*) FROM crmp_financial_shifts) AS shifts`
    );

    const tableNames = tables.map((t) => t.TABLE_NAME);
    const payload = {
      mode: MODE,
      database: dbName[0]?.db ?? null,
      hash0082,
      lastMigrations: mig,
      hash0082Applied: hashHit,
      refundDocumentSequencesPresent: tableNames.includes(
        "refund_document_sequences"
      ),
      refundDocumentNumbersPresent: tableNames.includes(
        "refund_document_numbers"
      ),
      indexes,
      refundSettlementRecords: refundSr[0].n,
      settlementSettlementRecords: settlementSr[0].n,
      platformCounts: platformCounts[0],
    };

    if (
      MODE === "post" ||
      (tableNames.includes("refund_document_sequences") &&
        tableNames.includes("refund_document_numbers"))
    ) {
      const [seqRows] = await conn.query(
        "SELECT restaurantId, lastNumber FROM refund_document_sequences ORDER BY restaurantId"
      );
      const [numCount] = await conn.query(
        "SELECT COUNT(*) AS n FROM refund_document_numbers"
      );
      const [nullSeq] = await conn.query(
        "SELECT COUNT(*) AS n FROM refund_document_numbers WHERE sequenceNumber IS NULL"
      );
      const [dupSeq] = await conn.query(
        `SELECT COUNT(*) AS n FROM (
           SELECT restaurantId, sequenceNumber
           FROM refund_document_numbers
           GROUP BY restaurantId, sequenceNumber
           HAVING COUNT(*) > 1
         ) t`
      );
      const [dupRecord] = await conn.query(
        `SELECT COUNT(*) AS n FROM (
           SELECT settlementRecordId
           FROM refund_document_numbers
           GROUP BY settlementRecordId
           HAVING COUNT(*) > 1
         ) t`
      );
      const [unboundRefunds] = await conn.query(
        `SELECT COUNT(*) AS n
         FROM settlement_records sr
         LEFT JOIN refund_document_numbers rdn
           ON rdn.settlementRecordId = sr.settlementRecordId
          AND rdn.restaurantId = sr.restaurantId
         WHERE sr.recordKind = 'refund'
           AND rdn.settlementRecordId IS NULL`
      );
      const [cursorOk] = await conn.query(
        `SELECT COUNT(*) AS n FROM (
           SELECT s.restaurantId, s.lastNumber, COALESCE(m.maxN, 0) AS maxN
           FROM refund_document_sequences s
           LEFT JOIN (
             SELECT restaurantId, MAX(sequenceNumber) AS maxN
             FROM refund_document_numbers
             GROUP BY restaurantId
           ) m ON m.restaurantId = s.restaurantId
           WHERE s.lastNumber < COALESCE(m.maxN, 0)
         ) t`
      );
      const [sample] = await conn.query(
        `SELECT restaurantId, settlementRecordId, sequenceNumber, createdAt
         FROM refund_document_numbers
         ORDER BY restaurantId, sequenceNumber
         LIMIT 20`
      );

      payload.post = {
        sequences: seqRows,
        refundDocumentNumberRows: numCount[0].n,
        nullSequenceNumber: nullSeq[0].n,
        dupRestaurantSequence: dupSeq[0].n,
        dupSettlementRecordId: dupRecord[0].n,
        unboundRefundSettlementRecords: unboundRefunds[0].n,
        sequenceCursorBehindMax: cursorOk[0].n,
        sampleNumbers: sample,
      };
    }

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("PROBE_FAIL", e.message);
  process.exit(1);
});

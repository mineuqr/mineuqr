/**
 * Direct SQL binding-table operational check (additive schema).
 */
import "dotenv/config";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const conn = await createAuditReadonlyConnection(process.env.DATABASE_URL);
try {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM commercial_subscription_bindings"
  );
  const [sample] = await conn.query(
    "SELECT id, subscriptionId, planVersionId, snapshotId, legacyPlanId, createdAt FROM commercial_subscription_bindings LIMIT 5"
  );
  console.log(
    JSON.stringify(
      {
        BINDING_TABLE_SELECT: "OK",
        rowCount: rows[0]?.cnt ?? null,
        sampleRows: sample,
      },
      null,
      2
    )
  );
} finally {
  await conn.end();
}

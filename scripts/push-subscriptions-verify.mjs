/**
 * TRUE-PUSH-VALIDATION-1 — verify customer_push_subscriptions row count.
 *
 * Usage:
 *   DATABASE_URL='...' node scripts/push-subscriptions-verify.mjs
 */
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(JSON.stringify({ status: "ABORTED", reason: "DATABASE_URL required" }));
  process.exit(1);
}

async function main() {
  const conn = await createAuditReadonlyConnection(url);
  try {
    const [countRows] = await conn.query(
      "SELECT COUNT(*) AS total FROM customer_push_subscriptions"
    );
    const [recentRows] = await conn.query(
      `SELECT id, orderId, trackingToken, createdAt, expiresAt
       FROM customer_push_subscriptions
       ORDER BY id DESC
       LIMIT 5`
    );
    console.log(
      JSON.stringify(
        {
          status: "OK",
          build: "TRUE-PUSH-VALIDATION-1",
          total: countRows[0]?.total ?? 0,
          recent: recentRows,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "ERROR", message: err.message }));
  process.exit(1);
});

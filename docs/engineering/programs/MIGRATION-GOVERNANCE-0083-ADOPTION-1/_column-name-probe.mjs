/**
 * Read-only: list identity/ordering column names on orders tables.
 */
import "dotenv/config";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

const conn = await createAuditReadonlyConnection(process.env.DATABASE_URL);
try {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('orders', 'order_read_orders')
       AND (
         COLUMN_NAME LIKE '%identity%'
         OR COLUMN_NAME LIKE '%ordering%'
         OR COLUMN_NAME LIKE '%scope%'
       )
     ORDER BY TABLE_NAME, ORDINAL_POSITION`
  );
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await conn.end();
}

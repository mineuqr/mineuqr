/**
 * PRODUCTION-MIGRATION-EXECUTION-0083 — read-only production pre/post probes.
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
      "../../../../drizzle/0083_order_ordering_channel.sql",
      import.meta.url
    )
  );
  const hash0083 = createHash("sha256").update(sqlFile).digest("hex");

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [dbName] = await conn.query("SELECT DATABASE() AS db");
    const [ping] = await conn.query("SELECT 1 AS ok");
    const [mig] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 5"
    );
    const [hashHit] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` WHERE hash = ?",
      [hash0083]
    );
    const [cols] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
              COLUMN_KEY, EXTRA, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('orders', 'order_read_orders')
         AND COLUMN_NAME = 'ordering_channel'
       ORDER BY TABLE_NAME`
    );
    const [neighbor] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('orders', 'order_read_orders')
         AND COLUMN_NAME IN ('identityScope', 'ordering_channel')
       ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );
    const [platformCounts] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM orders) AS orders,
         (SELECT COUNT(*) FROM order_read_orders) AS order_read_orders,
         (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
         (SELECT COUNT(*) FROM operational_checks) AS checks`
    );
    const [stampSample] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM orders WHERE ordering_channel IS NOT NULL) AS orders_stamped,
         (SELECT COUNT(*) FROM order_read_orders WHERE ordering_channel IS NOT NULL) AS read_stamped,
         (SELECT COUNT(*) FROM orders WHERE ordering_channel IS NULL) AS orders_null,
         (SELECT COUNT(*) FROM order_read_orders WHERE ordering_channel IS NULL) AS read_null`
    );

    const payload = {
      mode: MODE,
      database: dbName[0]?.db ?? null,
      connectionHealthy: ping[0]?.ok === 1,
      hash0083,
      lastMigrations: mig,
      hash0083Applied: hashHit,
      orderingChannelColumns: cols,
      identityScopeAndOrderingChannel: neighbor,
      platformCounts: platformCounts[0],
      stampCounts: stampSample[0],
      ordersOrderingChannelPresent: cols.some(
        (c) => c.TABLE_NAME === "orders" && c.COLUMN_NAME === "ordering_channel"
      ),
      orderReadOrderingChannelPresent: cols.some(
        (c) =>
          c.TABLE_NAME === "order_read_orders" &&
          c.COLUMN_NAME === "ordering_channel"
      ),
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("PROBE_FAIL", e.message);
  process.exit(1);
});

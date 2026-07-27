/**
 * ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 — Phase 1 read-only investigation.
 * No UPDATE / DDL. Audit connection only.
 */
import "dotenv/config";
import { createAuditReadonlyConnection } from "../../../../scripts/lib/tidb-audit-connection.mjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const conn = await createAuditReadonlyConnection(url);
  try {
    const [totals] = await conn.query(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(ordering_channel IS NULL OR ordering_channel = '') AS missing_channel,
         SUM(ordering_channel IS NOT NULL AND ordering_channel <> '') AS stamped,
         MIN(createdAt) AS oldest,
         MAX(createdAt) AS newest
       FROM orders`
    );

    const [byScope] = await conn.query(
      `SELECT
         COALESCE(identityScope, '(null)') AS identityScope,
         COUNT(*) AS n,
         SUM(ordering_channel IS NULL OR ordering_channel = '') AS missing,
         SUM(ordering_channel IS NOT NULL AND ordering_channel <> '') AS stamped
       FROM orders
       GROUP BY COALESCE(identityScope, '(null)')
       ORDER BY n DESC`
    );

    const [byFulfilment] = await conn.query(
      `SELECT
         COALESCE(fulfilmentAnchorType, '(null)') AS fulfilmentAnchorType,
         COALESCE(serviceMode, '(null)') AS serviceMode,
         COALESCE(identityScope, '(null)') AS identityScope,
         COUNT(*) AS n,
         SUM(ordering_channel IS NULL OR ordering_channel = '') AS missing
       FROM orders
       WHERE ordering_channel IS NULL OR ordering_channel = ''
       GROUP BY
         COALESCE(fulfilmentAnchorType, '(null)'),
         COALESCE(serviceMode, '(null)'),
         COALESCE(identityScope, '(null)')
       ORDER BY n DESC`
    );

    const [byRestaurant] = await conn.query(
      `SELECT
         restaurantId,
         COUNT(*) AS n,
         SUM(ordering_channel IS NULL OR ordering_channel = '') AS missing,
         MIN(createdAt) AS oldest,
         MAX(createdAt) AS newest
       FROM orders
       GROUP BY restaurantId
       ORDER BY missing DESC, n DESC`
    );

    const [byAge] = await conn.query(
      `SELECT
         CASE
           WHEN createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY) THEN '0-7d'
           WHEN createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY) THEN '8-30d'
           WHEN createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY) THEN '31-90d'
           ELSE '90d+'
         END AS age_bucket,
         COUNT(*) AS n,
         SUM(ordering_channel IS NULL OR ordering_channel = '') AS missing
       FROM orders
       GROUP BY age_bucket
       ORDER BY FIELD(age_bucket, '0-7d', '8-30d', '31-90d', '90d+')`
    );

    const [sessionLink] = await conn.query(
      `SELECT
         CASE
           WHEN sessionId IS NULL THEN 'no_session'
           ELSE 'has_session'
         END AS session_link,
         COALESCE(identityScope, '(null)') AS identityScope,
         COUNT(*) AS n
       FROM orders
       WHERE ordering_channel IS NULL OR ordering_channel = ''
       GROUP BY session_link, COALESCE(identityScope, '(null)')
       ORDER BY n DESC`
    );

    const [tracking] = await conn.query(
      `SELECT
         CASE
           WHEN trackingToken IS NULL OR trackingToken = '' THEN 'no_tracking'
           ELSE 'has_tracking'
         END AS tracking,
         COALESCE(identityScope, '(null)') AS identityScope,
         COUNT(*) AS n
       FROM orders
       WHERE ordering_channel IS NULL OR ordering_channel = ''
       GROUP BY tracking, COALESCE(identityScope, '(null)')
       ORDER BY n DESC`
    );

    const [stampedValues] = await conn.query(
      `SELECT ordering_channel, COUNT(*) AS n
       FROM orders
       WHERE ordering_channel IS NOT NULL AND ordering_channel <> ''
       GROUP BY ordering_channel
       ORDER BY n DESC`
    );

    const [readMissing] = await conn.query(
      `SELECT
         COUNT(*) AS total_read,
         SUM(ordering_channel IS NULL OR ordering_channel = '') AS missing_read,
         SUM(ordering_channel IS NOT NULL AND ordering_channel <> '') AS stamped_read
       FROM order_read_orders`
    );

    const [sampleMissing] = await conn.query(
      `SELECT id, restaurantId, identityScope, fulfilmentAnchorType, serviceMode,
              sessionId, trackingToken, status, createdAt
       FROM orders
       WHERE ordering_channel IS NULL OR ordering_channel = ''
       ORDER BY createdAt DESC
       LIMIT 15`
    );

    console.log(
      JSON.stringify(
        {
          totals: totals[0],
          byScope,
          byFulfilmentMissing: byFulfilment,
          byRestaurant,
          byAge,
          sessionLinkMissing: sessionLink,
          trackingMissing: tracking,
          stampedValues,
          orderRead: readMissing[0],
          sampleMissing,
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
  console.error("INVESTIGATION_FAIL", e.message);
  process.exit(1);
});

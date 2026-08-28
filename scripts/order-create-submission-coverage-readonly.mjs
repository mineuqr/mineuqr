/**
 * ORDER-CREATE-IDEMPOTENCY-FINAL-SIMPLE-HARDENING-1 — read-only coverage telemetry.
 *
 * Answers one question: may `submissionId` become REQUIRED on the public
 * Table/QR `order.create` contract yet?
 *
 * Vercel does not retain runtime logs for this project, so the
 * `order_create_legacy_missing_submission_id` console event cannot be counted
 * after the fact. A QR Order with no `order_create_idempotency` row is the
 * durable equivalent: the server only writes that row when the client supplied
 * a submissionId. This script counts those instead.
 *
 * Read-only. No writes, no schema, no new infrastructure.
 *
 * Usage:
 *   node scripts/order-create-submission-coverage-readonly.mjs
 *   node scripts/order-create-submission-coverage-readonly.mjs --since="2026-08-28 13:31:38" --min-orders=25
 */
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

/**
 * Commit 8af10afe — the first deploy whose Table/QR client sends submissionId.
 * Orders before this are pre-change history, not legacy omissions.
 */
const DEFAULT_SINCE_UTC = "2026-08-28 13:31:38";

/** Enforcement needs a real sample, not an idle window. */
const DEFAULT_MIN_ORDERS = 25;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sinceUtc = arg("since", DEFAULT_SINCE_UTC);
const minOrders = Number(arg("min-orders", String(DEFAULT_MIN_ORDERS)));

const conn = await createAuditReadonlyConnection(url);
try {
  // DATE_FORMAT keeps naive UTC strings; the driver otherwise returns Date
  // objects reinterpreted in the local zone, which shifts every timestamp.
  const [[clock]] = await conn.query(`
    SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s') AS utc_now
  `);

  const [[coverage]] = await conn.query(
    `
    SELECT
      COUNT(*) AS qr_orders,
      COALESCE(SUM(CASE WHEN i.orderId IS NULL THEN 1 ELSE 0 END), 0) AS unmapped,
      COALESCE(SUM(CASE WHEN i.orderId IS NULL THEN 0 ELSE 1 END), 0) AS mapped
    FROM orders o
    LEFT JOIN order_create_idempotency i
      ON i.restaurantId = o.restaurantId AND i.orderId = o.id
    WHERE o.\`ordering_channel\` = 'qr'
      AND o.createdAt >= ?
    `,
    [sinceUtc]
  );

  const [unmappedRows] = await conn.query(
    `
    SELECT o.id, o.restaurantId, o.tableNumber,
           DATE_FORMAT(o.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAtUtc
    FROM orders o
    LEFT JOIN order_create_idempotency i
      ON i.restaurantId = o.restaurantId AND i.orderId = o.id
    WHERE o.\`ordering_channel\` = 'qr'
      AND o.createdAt >= ?
      AND i.orderId IS NULL
    ORDER BY o.createdAt DESC
    LIMIT 50
    `,
    [sinceUtc]
  );

  const qrOrders = Number(coverage.qr_orders);
  const unmapped = Number(coverage.unmapped);

  let verdict;
  if (unmapped > 0) {
    verdict = "BLOCKED — legacy omission present; submissionId must stay optional";
  } else if (qrOrders < minOrders) {
    verdict = `INSUFFICIENT TRAFFIC — ${qrOrders}/${minOrders} QR Orders; keep optional`;
  } else {
    verdict = "READY — zero omissions over a justified window; submissionId may become REQUIRED";
  }

  console.log(
    JSON.stringify(
      {
        utcNow: clock.utc_now,
        sinceUtc,
        minOrders,
        qrOrders,
        mapped: Number(coverage.mapped),
        unmapped,
        unmappedRows,
        verdict,
      },
      null,
      2
    )
  );

  process.exit(unmapped > 0 ? 1 : 0);
} finally {
  await conn.end();
}

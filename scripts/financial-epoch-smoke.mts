/**
 * FINANCIAL-EPOCH-RESET-1 — production smoke after Epoch Zero.
 *
 * Create Order → Check → Mark Paid → Settlement Record → verify reporting facts.
 *
 *   FINANCIAL_EPOCH_SMOKE_CONFIRM=YES pnpm exec tsx scripts/financial-epoch-smoke.mts
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { createTableFulfilmentAnchor } from "../shared/ordering-platform/orderingIdentityContract";
import { getOrCreateSession, markPaid } from "../server/diningSession/sessionService";
import { createOpenCheckForSession } from "../server/operational-session/check/CheckService";
import { identityPlaceOrderService } from "../server/order/placeOrderComposition";
import { getBusinessMetricsSummary } from "../server/reporting-platform/BusinessMetricsService";
import { getPaymentMethodAnalytics } from "../server/reporting-platform/PaymentMethodAnalyticsService";

const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const p = new URL(url);
  return mysql.createConnection({
    host: p.hostname,
    port: p.port ? Number(p.port) : 3306,
    user: decodeURIComponent(p.username),
    password: decodeURIComponent(p.password),
    database: p.pathname.replace(/^\//, ""),
    ssl: /\.tidbcloud\.com$/i.test(p.hostname)
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
  });
}

async function main() {
  if (process.env.FINANCIAL_EPOCH_SMOKE_CONFIRM !== "YES") {
    console.error(
      "[epoch-smoke] Refusing without FINANCIAL_EPOCH_SMOKE_CONFIRM=YES"
    );
    process.exit(1);
  }

  const conn = await connect();
  const [candidates] = await conn.query(`
    SELECT r.id AS restaurantId, t.id AS tableId, t.tableNumber, m.id AS menuItemId, m.price
    FROM restaurants r
    INNER JOIN restaurant_tables t ON t.restaurantId = r.id
    INNER JOIN menu_items m ON m.restaurantId = r.id
    ORDER BY r.id, t.id, m.id
    LIMIT 1
  `);
  const [users] = await conn.query(`
    SELECT id FROM users ORDER BY id LIMIT 1
  `);
  await conn.end();

  if (!candidates.length) {
    throw new Error("No restaurant with table + menu item for smoke");
  }
  if (!users.length) {
    throw new Error("No user available for markPaid actorUserId");
  }

  const { restaurantId, tableId, tableNumber, menuItemId, price } =
    candidates[0] as {
      restaurantId: number;
      tableId: number;
      tableNumber: number;
      menuItemId: number;
      price: string;
    };
  const actorUserId = Number((users[0] as { id: number }).id);

  console.log(
    JSON.stringify(
      { step: "context", restaurantId, tableId, tableNumber, menuItemId, price },
      null,
      2
    )
  );

  const { session, created } = await getOrCreateSession({
    restaurantId,
    tableId,
    tableNumber,
  });
  console.log(
    JSON.stringify(
      {
        step: "session",
        sessionId: session.id,
        created,
        activeCheckId: session.activeCheckId,
      },
      null,
      2
    )
  );

  const orderResult = await identityPlaceOrderService.execute({
    restaurantId,
    serviceMode: "table_service",
    fulfilmentAnchor: createTableFulfilmentAnchor({
      tableId,
      tableNumber,
    }),
    sessionToken: session.sessionToken,
    identityScope: "WAITER",
    items: [{ menuItemId, quantity: 1 }],
  });

  console.log(
    JSON.stringify(
      {
        step: "order",
        orderId: orderResult.orderId ?? (orderResult as { order?: { id: number } }).order?.id,
        sessionId: orderResult.identity.operationalSession.sessionId,
      },
      null,
      2
    )
  );

  // Table PlaceOrder dual-write can lag in scripted smoke — force Membership + money sync.
  const syncedCheck = await createOpenCheckForSession({
    restaurantId,
    sessionId: session.id,
  });
  console.log(
    JSON.stringify(
      {
        step: "checkSync",
        checkId: syncedCheck.id,
        grandTotal: syncedCheck.grandTotal,
        outcome: syncedCheck.outcome,
      },
      null,
      2
    )
  );

  await markPaid({
    restaurantId,
    sessionId: session.id,
    actorUserId,
    settlements: [{ paymentMethod: "cash" }],
  });

  console.log(JSON.stringify({ step: "markPaid", ok: true }, null, 2));

  const verify = await connect();
  const [[sr]] = await verify.query(
    `SELECT settlementRecordId, checkId, outcome, grandTotal, taxAmount,
            recordGeneration, recordKind, businessDay
     FROM settlement_records
     WHERE restaurantId = ?
     ORDER BY createdAt ASC
     LIMIT 1`,
    [restaurantId]
  );
  const [[counts]] = await verify.query(`
    SELECT
      (SELECT COUNT(*) FROM settlement_records) AS settlement_records,
      (SELECT COUNT(*) FROM check_settlement_transactions WHERE status='captured') AS captured_tenders,
      (SELECT COUNT(*) FROM operational_checks WHERE outcome='paid') AS paid_checks
  `);
  await verify.end();

  const business = await getBusinessMetricsSummary({ restaurantId });
  const payments = await getPaymentMethodAnalytics({ restaurantId });

  const smokePass =
    Boolean(sr) &&
    Number(counts.settlement_records) === 1 &&
    Number(counts.paid_checks) === 1 &&
    Number(counts.captured_tenders) >= 1 &&
    business.paidCheckCount === 1 &&
    Number.parseFloat(business.revenue) > 0 &&
    payments.buckets.some((b) => b.paymentMethod === "cash");

  console.log(
    JSON.stringify(
      {
        settlementRecord: sr,
        counts,
        reporting: {
          revenue: business.revenue,
          taxCollected: business.taxCollected,
          paidCheckCount: business.paidCheckCount,
          averageCheck: business.averageCheck,
          monetaryTenderTotal: payments.monetaryTenderTotal,
          paymentMethods: payments.buckets.map((b) => b.paymentMethod),
        },
        smokeVerdict: smokePass ? "SMOKE_PASS" : "SMOKE_FAIL",
      },
      null,
      2
    )
  );

  if (!smokePass) process.exit(2);
}

main().catch((e) => {
  console.error("[epoch-smoke] failed", e);
  process.exit(1);
});

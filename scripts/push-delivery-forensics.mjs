/**
 * TRUE-PUSH-VALIDATION-1B — READY push delivery forensics (readonly).
 *
 * Reconstructs Subscribe → READY → send outcome from DB timestamps.
 * Ops logs (customer_push_send_*) live in Vercel/host stdout — not in DB.
 *
 * Usage:
 *   DATABASE_URL='<gateway01/mineuqr>' node -r dotenv/config scripts/push-delivery-forensics.mjs
 *   DATABASE_URL='...' node scripts/push-delivery-forensics.mjs --order-id=123
 *   DATABASE_URL='...' node scripts/push-delivery-forensics.mjs --tracking-token=abc...
 */
import { createAuditReadonlyConnection, auditConnectionTarget } from "./lib/tidb-audit-connection.mjs";

const args = process.argv.slice(2);
const orderIdArg = args.find((a) => a.startsWith("--order-id="))?.split("=")[1];
const tokenArg = args.find((a) => a.startsWith("--tracking-token="))?.split("=")[1];
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : 10;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(JSON.stringify({ status: "ABORTED", reason: "DATABASE_URL required" }));
  process.exit(1);
}

function inferSendOutcome(order) {
  const { status, readyPushSentAt, subscriptionCount, subsBeforeReady, lastUsedAt } = order;

  if (status !== "ready" && status !== "served") {
    return { verdict: "ORDER_NOT_READY", detail: "Order has not reached READY terminal check" };
  }

  if (subscriptionCount === 0) {
    return {
      verdict: "LIKELY_SKIPPED_NO_SUBSCRIPTIONS",
      detail: "No push subscription rows for this order — sendReadyPushForOrder exits before claim",
    };
  }

  if (subsBeforeReady === 0 && subscriptionCount > 0) {
    return {
      verdict: "LIKELY_SKIPPED_LATE_SUBSCRIBE",
      detail:
        "All subscription rows created AFTER order updatedAt — push fired at READY with zero subs",
    };
  }

  if (readyPushSentAt) {
    return {
      verdict: "SERVER_SEND_SUCCEEDED",
      detail:
        "readyPushSentAt set — webpush.sendNotification returned success for ≥1 subscription (HTTP accept)",
    };
  }

  if (lastUsedAt) {
    return {
      verdict: "SERVER_SEND_SUCCEEDED",
      detail: "subscription.lastUsedAt set — touchPushSubscriptionLastUsed ran after successful send",
    };
  }

  if (subscriptionCount > 0 && subsBeforeReady > 0) {
    return {
      verdict: "LIKELY_SEND_FAILED_OR_SKIPPED",
      detail:
        "Subs existed before READY but readyPushSentAt NULL — check ops logs: no_vapid, claim_failed, all_subscriptions_failed",
    };
  }

  return { verdict: "INDETERMINATE", detail: "Insufficient timeline data" };
}

async function main() {
  const target = auditConnectionTarget(url);
  const conn = await createAuditReadonlyConnection(url);

  try {
    let orders;
    if (orderIdArg) {
      const [rows] = await conn.query(
        `SELECT o.id, o.orderNumber, o.status, o.trackingToken, o.readyPushSentAt,
                o.createdAt, o.updatedAt, r.slug
         FROM orders o
         INNER JOIN restaurants r ON r.id = o.restaurantId
         WHERE o.id = ?`,
        [Number(orderIdArg)]
      );
      orders = rows;
    } else if (tokenArg) {
      const [rows] = await conn.query(
        `SELECT o.id, o.orderNumber, o.status, o.trackingToken, o.readyPushSentAt,
                o.createdAt, o.updatedAt, r.slug
         FROM orders o
         INNER JOIN restaurants r ON r.id = o.restaurantId
         WHERE o.trackingToken = ?`,
        [tokenArg]
      );
      orders = rows;
    } else {
      const [rows] = await conn.query(
        `SELECT o.id, o.orderNumber, o.status, o.trackingToken, o.readyPushSentAt,
                o.createdAt, o.updatedAt, r.slug
         FROM orders o
         INNER JOIN restaurants r ON r.id = o.restaurantId
         WHERE o.status IN ('ready', 'served')
         ORDER BY o.updatedAt DESC
         LIMIT ?`,
        [limit]
      );
      orders = rows;
    }

    const timeline = [];

    for (const order of orders) {
      const [subs] = await conn.query(
        `SELECT id, orderId, LEFT(trackingToken, 12) AS trackingTokenPrefix,
                createdAt, expiresAt, lastUsedAt, updatedAt
         FROM customer_push_subscriptions
         WHERE orderId = ?
         ORDER BY createdAt ASC`,
        [order.id]
      );

      const subsBeforeReady = subs.filter(
        (s) => s.createdAt && order.updatedAt && String(s.createdAt) <= String(order.updatedAt)
      ).length;

      const lastUsedAt = subs.reduce((max, s) => {
        if (!s.lastUsedAt) return max;
        return !max || String(s.lastUsedAt) > String(max) ? s.lastUsedAt : max;
      }, null);

      const row = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        slug: order.slug,
        status: order.status,
        trackingTokenPrefix: order.trackingToken?.slice(0, 12) ?? null,
        orderCreatedAt: order.createdAt,
        orderUpdatedAt: order.updatedAt,
        readyPushSentAt: order.readyPushSentAt,
        subscriptionCount: subs.length,
        subsCreatedBeforeOrderUpdatedAt: subsBeforeReady,
        subscriptionLastUsedAt: lastUsedAt,
        subscriptions: subs,
        sendInference: inferSendOutcome({
          status: order.status,
          readyPushSentAt: order.readyPushSentAt,
          subscriptionCount: subs.length,
          subsBeforeReady,
          lastUsedAt,
        }),
      };

      timeline.push(row);
    }

    console.log(
      JSON.stringify(
        {
          status: "OK",
          build: "TRUE-PUSH-VALIDATION-1B",
          target,
          interpretedSignals: {
            readyPushSentAt_not_null: "webpush.sendNotification succeeded (server accepted by push endpoint)",
            readyPushSentAt_null_with_subs_before_ready:
              "send skipped (no_vapid/no_subscriptions/claim_failed) OR all sends failed (claim released)",
            lastUsedAt_not_null: "same as successful send — touchPushSubscriptionLastUsed",
            subsCreatedAfterOrderUpdatedAt:
              "late subscribe — push at READY transition saw zero subscriptions",
          },
          opsLogTypesToGrep: [
            "customer_push_subscribe_ok",
            "customer_push_send_ok",
            "customer_push_send_skipped",
            "customer_push_send_failed",
          ],
          skipReasons: [
            "no_tracking_token",
            "no_vapid",
            "no_push_context",
            "no_subscriptions",
            "claim_failed",
            "all_subscriptions_failed",
          ],
          orders: timeline,
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

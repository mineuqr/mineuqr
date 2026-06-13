/**
 * BACKGROUND-NOTIFICATIONS-1A — send READY Web Push to subscribed devices.
 * HOTFIX-1: claim only after subscriptions exist; release claim if all sends fail.
 */

import webpush from "web-push";
import { getOrderPushContext } from "../db";
import { opsLog } from "../_core/opsLog";
import { buildReadyPushCopy, buildReadyPushUrl } from "./copy";
import {
  claimReadyPushForOrder,
  listActiveSubscriptionsForOrder,
  releaseReadyPushForOrder,
  removeStalePushSubscription,
  touchPushSubscriptionLastUsed,
} from "./subscriptionRepository";
import { ensureWebPushVapidConfigured } from "./vapid";

export type SendReadyPushOrderInput = {
  orderId: number;
  trackingToken: string | null;
  orderNumber: string;
};

type PushSkipReason =
  | "no_tracking_token"
  | "no_vapid"
  | "no_push_context"
  | "no_subscriptions"
  | "claim_failed";

function logPushSendSkipped(orderId: number, reason: PushSkipReason): void {
  opsLog({
    type: "customer_push_send_skipped",
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    metadata: { orderId, reason },
  });
}

function isStaleSubscriptionError(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export async function sendReadyPushForOrder(
  input: SendReadyPushOrderInput
): Promise<void> {
  const { orderId } = input;

  if (!input.trackingToken) {
    logPushSendSkipped(orderId, "no_tracking_token");
    return;
  }
  if (!ensureWebPushVapidConfigured()) {
    logPushSendSkipped(orderId, "no_vapid");
    return;
  }

  const context = await getOrderPushContext(orderId);
  if (!context?.trackingToken || !context.slug) {
    logPushSendSkipped(orderId, "no_push_context");
    return;
  }

  const subscriptions = await listActiveSubscriptionsForOrder(orderId);
  if (subscriptions.length === 0) {
    logPushSendSkipped(orderId, "no_subscriptions");
    return;
  }

  const claimed = await claimReadyPushForOrder(orderId);
  if (!claimed) {
    logPushSendSkipped(orderId, "claim_failed");
    return;
  }

  const copy = buildReadyPushCopy(context.orderNumber, "ar");
  const url = buildReadyPushUrl(context.slug, context.trackingToken);

  const payload = JSON.stringify({
    type: "order_ready",
    tier: 1,
    slug: context.slug,
    trackingToken: context.trackingToken,
    orderNumber: context.orderNumber,
    language: copy.language,
    title: copy.title,
    body: copy.body,
    url,
  });

  let successCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        await touchPushSubscriptionLastUsed(sub.id);
        successCount += 1;
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        if (isStaleSubscriptionError(statusCode)) {
          await removeStalePushSubscription(sub.orderId, sub.endpoint);
        }

        opsLog({
          type: "customer_push_send_failed",
          category: "ORDER",
          severity: "warn",
          ts: new Date().toISOString(),
          metadata: {
            orderId,
            subscriptionId: sub.id,
            statusCode: statusCode ?? null,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    })
  );

  if (successCount === 0) {
    await releaseReadyPushForOrder(orderId);
    opsLog({
      type: "customer_push_send_failed",
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      metadata: {
        orderId,
        reason: "all_subscriptions_failed",
        subscriptionCount: subscriptions.length,
      },
    });
    return;
  }

  opsLog({
    type: "customer_push_send_ok",
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    metadata: {
      orderId,
      successCount,
      subscriptionCount: subscriptions.length,
    },
  });
}

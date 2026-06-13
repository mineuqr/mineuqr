/**
 * BACKGROUND-NOTIFICATIONS-1A — send READY Web Push to subscribed devices.
 */

import webpush from "web-push";
import { getOrderPushContext } from "../db";
import { opsLog } from "../_core/opsLog";
import { buildReadyPushCopy, buildReadyPushUrl } from "./copy";
import {
  claimReadyPushForOrder,
  listActiveSubscriptionsForOrder,
  removeStalePushSubscription,
  touchPushSubscriptionLastUsed,
} from "./subscriptionRepository";
import { ensureWebPushVapidConfigured } from "./vapid";

export type SendReadyPushOrderInput = {
  orderId: number;
  trackingToken: string | null;
  orderNumber: string;
};

function isStaleSubscriptionError(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export async function sendReadyPushForOrder(
  input: SendReadyPushOrderInput
): Promise<void> {
  if (!input.trackingToken) return;
  if (!ensureWebPushVapidConfigured()) return;

  const claimed = await claimReadyPushForOrder(input.orderId);
  if (!claimed) return;

  const context = await getOrderPushContext(input.orderId);
  if (!context?.trackingToken || !context.slug) return;

  const subscriptions = await listActiveSubscriptionsForOrder(input.orderId);
  if (subscriptions.length === 0) return;

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
            orderId: input.orderId,
            subscriptionId: sub.id,
            statusCode: statusCode ?? null,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    })
  );
}

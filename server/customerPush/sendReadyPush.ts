/**
 * BACKGROUND-NOTIFICATIONS-1A — send READY Web Push to subscribed devices.
 * PUSH-DELIVERY-VALIDATION-1 — staged delivery tracing + diagnostics.
 */

import webpush from "web-push";
import { getOrderPushContext } from "../db";
import { opsLog } from "../_core/opsLog";
import { buildReadyPushCopy, buildReadyPushUrl } from "./copy";
import {
  classifySendFailure,
  PushDeliveryTrace,
  type PushDeliveryFailureReason,
} from "./pushDeliveryDiagnostics";
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

function logPushDelivery(
  type: "customer_push_send_skipped" | "customer_push_send_failed" | "customer_push_send_ok",
  trace: PushDeliveryTrace,
  extra?: Record<string, unknown>
): void {
  const diagnostics = trace.getDiagnostics();
  const severity =
    type === "customer_push_send_ok" ? "info" : type === "customer_push_send_skipped" ? "info" : "warn";

  opsLog({
    type,
    category: "ORDER",
    severity,
    ts: new Date().toISOString(),
    metadata: {
      orderId: diagnostics.orderId,
      reason: diagnostics.failureReason,
      deliveryStage: diagnostics.lastStage,
      deliveryDiagnostics: diagnostics,
      ...extra,
    },
  });
}

function skipDelivery(trace: PushDeliveryTrace, reason: PushDeliveryFailureReason): void {
  trace.setFailure(reason);
  logPushDelivery("customer_push_send_skipped", trace, { reason });
}

function isStaleSubscriptionError(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export async function sendReadyPushForOrder(
  input: SendReadyPushOrderInput
): Promise<void> {
  const trace = new PushDeliveryTrace(input.orderId);

  if (!input.trackingToken) {
    skipDelivery(trace, "no_tracking_token");
    return;
  }
  if (!ensureWebPushVapidConfigured()) {
    skipDelivery(trace, "no_vapid");
    return;
  }

  const context = await getOrderPushContext(input.orderId);
  if (!context?.trackingToken || !context.slug) {
    skipDelivery(trace, "no_push_context");
    return;
  }

  const subscriptions = await listActiveSubscriptionsForOrder(input.orderId);
  trace.setSubscriptionsLoaded(subscriptions.length);

  if (subscriptions.length === 0) {
    skipDelivery(trace, "no_subscriptions");
    return;
  }

  trace.markClaimAttempt();
  const claimed = await claimReadyPushForOrder(input.orderId);
  if (!claimed) {
    trace.markClaimFailed();
    logPushDelivery("customer_push_send_skipped", trace, { reason: "claim_failed" });
    return;
  }

  const claimTimestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  trace.markClaimAcquired(claimTimestamp);

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
      trace.markSendStarted();
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
        trace.markSendSuccess();
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        const sendFailure = classifySendFailure(statusCode);
        trace.markSendFailed(sendFailure);

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
            reason: sendFailure,
            statusCode: statusCode ?? null,
            message: err instanceof Error ? err.message : String(err),
            deliveryDiagnostics: trace.getDiagnostics(),
          },
        });
      }
    })
  );

  const diagnostics = trace.getDiagnostics();

  if (diagnostics.successfulSends === 0) {
    await releaseReadyPushForOrder(input.orderId);
    trace.markReadyPushReleased();
    trace.setFailure("all_subscriptions_failed");
    logPushDelivery("customer_push_send_failed", trace, {
      reason: "all_subscriptions_failed",
      subscriptionCount: diagnostics.subscriptionCount,
    });
    return;
  }

  trace.markDeliveryComplete();
  logPushDelivery("customer_push_send_ok", trace, {
    successCount: diagnostics.successfulSends,
    subscriptionCount: diagnostics.subscriptionCount,
    failedSends: diagnostics.failedSends,
  });
}

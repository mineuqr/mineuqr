/**
 * BACKGROUND-NOTIFICATIONS-1A — send READY Web Push to subscribed devices.
 * DELIVERY-HARDENING-1 — observability + subscription lifecycle diagnostics.
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
  countExpiredSubscriptionsForOrder,
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
      trackingToken: diagnostics.trackingToken,
      reason: diagnostics.failureReason,
      deliveryStage: diagnostics.lastStage,
      deliveryTimeline: diagnostics.deliveryTimeline,
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
  const trace = new PushDeliveryTrace(input.orderId, input.trackingToken);

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

  trace.setTrackingToken(context.trackingToken);

  const subscriptions = await listActiveSubscriptionsForOrder(input.orderId);
  const expiredCount = await countExpiredSubscriptionsForOrder(input.orderId);
  trace.setSubscriptionsLoaded(subscriptions.length, expiredCount);

  if (subscriptions.length === 0) {
    if (expiredCount > 0) {
      trace.setFailure("subscriptions_all_expired");
      logPushDelivery("customer_push_send_skipped", trace, {
        reason: "subscriptions_all_expired",
        expiredSubscriptionCount: expiredCount,
      });
      return;
    }
    skipDelivery(trace, "no_subscriptions");
    return;
  }

  trace.markClaimAttempt();
  const claimed = await claimReadyPushForOrder(input.orderId);
  if (!claimed) {
    trace.markClaimFailedDuplicate();
    logPushDelivery("customer_push_send_skipped", trace, {
      reason: "claim_failed",
      duplicateSendPrevented: true,
    });
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
        const lastUsedAt = await touchPushSubscriptionLastUsed(sub.id);
        trace.markSendSuccess(lastUsedAt ?? claimTimestamp);
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        const sendFailure = classifySendFailure(statusCode);
        trace.markSendFailed(sendFailure);

        if (isStaleSubscriptionError(statusCode)) {
          await removeStalePushSubscription(sub.orderId, sub.endpoint);
          trace.markStaleSubscriptionRemoved();
        }

        opsLog({
          type: "customer_push_send_failed",
          category: "ORDER",
          severity: "warn",
          ts: new Date().toISOString(),
          metadata: {
            orderId: input.orderId,
            trackingToken: context.trackingToken,
            subscriptionId: sub.id,
            reason: sendFailure,
            statusCode: statusCode ?? null,
            message: err instanceof Error ? err.message : String(err),
            deliveryTimeline: trace.getDiagnostics().deliveryTimeline,
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
    successCount: diagnostics.successCount,
    failureCount: diagnostics.failureCount,
    subscriptionCount: diagnostics.subscriptionCount,
  });
}

/**
 * CUSTOMER-UX-1C-HOTFIX-1E + PUSH-SUBSCRIPTION-HARDENING-1 — ready alert diagnostics.
 */

import type { ReadyAlertDelivery, ReadyAlertTier } from "@/lib/readyNotification";
import { isPushTraceEnabled } from "@/lib/customerPushDiagnostics";
import { getNotificationAudioContextState } from "@/lib/notificationSound";
import type { PushSubscribeOutcomeReason, PushSubscriptionState } from "@/lib/pushSubscriptionState";

const DEV = import.meta.env.DEV;

function shouldLogReadyAlertDiagnostics(): boolean {
  return DEV || isPushTraceEnabled();
}

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function logReadyAlertActivation(
  trackingToken: string,
  result: {
    audioReady: boolean;
    permissionBefore?: NotificationPermission | "unsupported";
    permission: NotificationPermission | "unsupported";
    pushSubscribed?: boolean;
    pushSubscribeReason?: PushSubscribeOutcomeReason;
    pushSubscriptionState?: PushSubscriptionState;
    diagnostics?: {
      permissionBefore: NotificationPermission | "unsupported";
      permissionAfter: NotificationPermission | "unsupported";
      pushSubscribed: boolean;
      pushSubscribeReason: PushSubscribeOutcomeReason | null;
      pushSubscriptionState: PushSubscriptionState;
      isIosSafariTab: boolean;
    };
  }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  const outcome = result.pushSubscribeReason ?? "skipped_permission";
  console.info("[mineuqr:ready-alert] activation", {
    trackingToken: trackingToken.slice(0, 8) + "…",
    audioContextState: getNotificationAudioContextState(),
    permissionBefore: result.permissionBefore ?? result.diagnostics?.permissionBefore ?? null,
    permissionAfter: result.permission,
    audioReady: result.audioReady,
    pushSubscribed: result.pushSubscribed ?? false,
    pushSubscribeReason: result.pushSubscribeReason ?? null,
    pushSubscriptionState: result.pushSubscriptionState ?? null,
    subscriptionOutcome: outcome,
    isIosSafariTab: result.diagnostics?.isIosSafariTab ?? null,
  });
}

export function logReadyAlertDelivery(
  trackingToken: string,
  tier: ReadyAlertTier,
  delivery: ReadyAlertDelivery,
  context?: { alertsActivated: boolean; skipped?: boolean }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] delivery", {
    trackingToken: trackingToken.slice(0, 8) + "…",
    tier,
    permission: getNotificationPermission(),
    audioContextState: getNotificationAudioContextState(),
    sound: delivery.sound,
    notification: delivery.notification,
    vibrate: delivery.vibrate,
    anyChannelDelivered: delivery.sound || delivery.notification || delivery.vibrate,
    ...context,
  });
}

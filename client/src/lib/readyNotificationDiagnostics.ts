/**
 * CUSTOMER-UX-1C-HOTFIX-1E + TRUE-PUSH-VALIDATION-1 — ready alert diagnostics.
 */

import type { ReadyAlertDelivery, ReadyAlertTier } from "@/lib/readyNotification";
import type { PushSubscribeFailureReason } from "@/lib/customerPush";
import { isPushTraceEnabled } from "@/lib/customerPushDiagnostics";
import { getNotificationAudioContextState } from "@/lib/notificationSound";

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
    permission: NotificationPermission | "unsupported";
    pushSubscribed?: boolean;
    pushSubscribeReason?: PushSubscribeFailureReason | "success" | "skipped_permission";
  }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] activation", {
    trackingToken: trackingToken.slice(0, 8) + "…",
    audioContextState: getNotificationAudioContextState(),
    permission: result.permission,
    audioReady: result.audioReady,
    pushSubscribed: result.pushSubscribed ?? false,
    pushSubscribeReason: result.pushSubscribeReason ?? null,
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

/**
 * CUSTOMER-UX-1C-HOTFIX-1E — development-only ready alert diagnostics.
 */

import type { ReadyAlertDelivery, ReadyAlertTier } from "@/lib/readyNotification";
import { getNotificationAudioContextState } from "@/lib/notificationSound";

const DEV = import.meta.env.DEV;

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
    htmlAudioPrimed: boolean;
    permission: NotificationPermission | "unsupported";
    pushSubscribed?: boolean;
  }
): void {
  if (!DEV) return;
  console.info("[mineuqr:ready-alert] activation", {
    trackingToken: trackingToken.slice(0, 8) + "…",
    audioContextState: getNotificationAudioContextState(),
    permission: result.permission,
    audioReady: result.audioReady,
    htmlAudioPrimed: result.htmlAudioPrimed,
    pushSubscribed: result.pushSubscribed ?? false,
  });
}

export function logReadyAlertDelivery(
  trackingToken: string,
  tier: ReadyAlertTier,
  delivery: ReadyAlertDelivery,
  context?: { alertsActivated: boolean; skipped?: boolean }
): void {
  if (!DEV) return;
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

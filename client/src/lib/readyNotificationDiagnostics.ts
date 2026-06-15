/**
 * CUSTOMER-UX-1C-HOTFIX-1E + FOREGROUND-READY-ALERT-RECOVERY-1 — ready alert diagnostics.
 */

import type { ReadyAlertDelivery, ReadyAlertTier } from "@/lib/readyNotification";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { isPushTraceEnabled } from "@/lib/customerPushDiagnostics";
import { getNotificationAudioContextState } from "@/lib/notificationSound";
import type { PushSubscribeOutcomeReason, PushSubscriptionState } from "@/lib/pushSubscriptionState";

export const READY_ALERT_DIAGNOSTICS_BUILD = "FOREGROUND-READY-ALERT-RECOVERY-1";

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

function deliveryChannels(delivery: ReadyAlertDelivery): string[] {
  const channels: string[] = [];
  if (delivery.sound) channels.push("sound");
  if (delivery.notification) channels.push("notification");
  if (delivery.vibrate) channels.push("vibrate");
  return channels;
}

export function logReadyTransitionDetected(
  trackingToken: string,
  previousStatus: OrderLifecycleStatus | null | undefined,
  currentStatus: OrderLifecycleStatus
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] READY detected", {
    build: READY_ALERT_DIAGNOSTICS_BUILD,
    trackingToken: trackingToken.slice(0, 8) + "…",
    previousStatus,
    currentStatus,
  });
}

export function logReadyAlertRecoveryAttempt(
  trackingToken: string,
  context: { lastStatus?: OrderLifecycleStatus; alertsActivated: boolean; alert1Sent: boolean }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] recovery delivery attempt", {
    build: READY_ALERT_DIAGNOSTICS_BUILD,
    trackingToken: trackingToken.slice(0, 8) + "…",
    ...context,
  });
}

export function logReadyAlertDeliverySkipped(
  trackingToken: string,
  tier: ReadyAlertTier,
  reason: "alertsActivated_false" | "no_channel_delivered",
  delivery: ReadyAlertDelivery,
  context?: { alertsActivated: boolean; source?: "transition" | "recovery" }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] delivery skipped", {
    build: READY_ALERT_DIAGNOSTICS_BUILD,
    trackingToken: trackingToken.slice(0, 8) + "…",
    tier,
    reason,
    source: context?.source ?? null,
    alertsActivated: context?.alertsActivated ?? null,
    permission: getNotificationPermission(),
    audioContextState: getNotificationAudioContextState(),
    sound: delivery.sound,
    notification: delivery.notification,
    vibrate: delivery.vibrate,
  });
}

export function logReadyAlertDeliverySucceeded(
  trackingToken: string,
  tier: ReadyAlertTier,
  delivery: ReadyAlertDelivery,
  context?: { source?: "transition" | "recovery" }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] delivery succeeded", {
    build: READY_ALERT_DIAGNOSTICS_BUILD,
    trackingToken: trackingToken.slice(0, 8) + "…",
    tier,
    source: context?.source ?? null,
    channels: deliveryChannels(delivery).join(","),
    sound: delivery.sound,
    notification: delivery.notification,
    vibrate: delivery.vibrate,
  });
}

export function logAlert1SentPersisted(
  trackingToken: string,
  context: { source: "transition" | "recovery"; notificationDelivered: boolean }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  console.info("[mineuqr:ready-alert] alert1Sent persisted", {
    build: READY_ALERT_DIAGNOSTICS_BUILD,
    trackingToken: trackingToken.slice(0, 8) + "…",
    ...context,
  });
}

export function logReadyAlertDelivery(
  trackingToken: string,
  tier: ReadyAlertTier,
  delivery: ReadyAlertDelivery,
  context?: { alertsActivated: boolean; skipped?: boolean }
): void {
  if (!shouldLogReadyAlertDiagnostics()) return;
  const anyChannelDelivered = delivery.sound || delivery.notification || delivery.vibrate;
  console.info("[mineuqr:ready-alert] delivery", {
    build: READY_ALERT_DIAGNOSTICS_BUILD,
    trackingToken: trackingToken.slice(0, 8) + "…",
    tier,
    permission: getNotificationPermission(),
    audioContextState: getNotificationAudioContextState(),
    sound: delivery.sound,
    notification: delivery.notification,
    vibrate: delivery.vibrate,
    anyChannelDelivered,
    ...context,
  });
}

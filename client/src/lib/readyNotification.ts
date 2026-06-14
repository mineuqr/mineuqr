/**
 * CUSTOMER-UX-1C — Ready notification infrastructure (client-only).
 * HOTFIX-1: gesture activation, per-channel delivery reporting.
 */

import { playCustomerAlertSound, unlockCustomerReadyAudioFromGesture } from "@/lib/notificationSound";
import {
  isAudio4SpikeEnabled,
  prepareCustomerReadyAudioFromGesture,
} from "@/lib/customerReadyAudioSpike4";
import { subscribeCustomerPush } from "@/lib/customerPush";
import { logReadyAlertDelivery } from "@/lib/readyNotificationDiagnostics";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";

export const READY_ALERT_FOLLOW_UP_MS = 30_000;

export type ReadyAlertSessionState = {
  alertsActivated: boolean;
  pushSubscriptionActive: boolean;
  alert1Sent: boolean;
  alert1NotificationDelivered: boolean;
  alert2Sent: boolean;
  alert2NotificationDelivered: boolean;
  acknowledged: boolean;
  lastStatus?: OrderLifecycleStatus;
};

export type ReadyAlertTier = 1 | 2;

const PREFIX = "mineuqr:ready-alerts:";

const followUpTimers = new Map<string, ReturnType<typeof setTimeout>>();

function emptyReadyAlertState(): ReadyAlertSessionState {
  return {
    alertsActivated: false,
    pushSubscriptionActive: false,
    alert1Sent: false,
    alert1NotificationDelivered: false,
    alert2Sent: false,
    alert2NotificationDelivered: false,
    acknowledged: false,
  };
}

export function readyAlertStorageKey(trackingToken: string): string {
  return `${PREFIX}${trackingToken}`;
}

export function loadReadyAlertState(trackingToken: string): ReadyAlertSessionState {
  const empty = emptyReadyAlertState();
  if (!trackingToken) return empty;
  try {
    const raw = sessionStorage.getItem(readyAlertStorageKey(trackingToken));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<ReadyAlertSessionState>;
    return {
      alertsActivated: Boolean(parsed.alertsActivated),
      pushSubscriptionActive: Boolean(parsed.pushSubscriptionActive),
      alert1Sent: Boolean(parsed.alert1Sent),
      alert1NotificationDelivered: Boolean(parsed.alert1NotificationDelivered),
      alert2Sent: Boolean(parsed.alert2Sent),
      alert2NotificationDelivered: Boolean(parsed.alert2NotificationDelivered),
      acknowledged: Boolean(parsed.acknowledged),
      lastStatus: parsed.lastStatus,
    };
  } catch {
    return empty;
  }
}

export function saveReadyAlertState(
  trackingToken: string,
  state: ReadyAlertSessionState
): void {
  if (!trackingToken) return;
  try {
    sessionStorage.setItem(readyAlertStorageKey(trackingToken), JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

/** Product rule: transition into ready from a non-ready state. */
export function isReadyTransition(
  previousStatus: OrderLifecycleStatus | null | undefined,
  currentStatus: OrderLifecycleStatus | null | undefined
): boolean {
  if (!currentStatus || currentStatus !== "ready") return false;
  if (!previousStatus || previousStatus === "ready") return false;
  return previousStatus === "pending" || previousStatus === "preparing";
}

/** Request permission only when still default — must be called from user gesture. */
export async function requestReadyNotificationPermissionFromGesture(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** HOTFIX-1A + BACKGROUND-NOTIFICATIONS-1A + AUDIO-HOTFIX-3A: unlock audio, permission, and push from user tap. */
export async function activateReadyAlertsFromGesture(options: {
  trackingToken: string;
  slug: string;
}): Promise<{
  audioReady: boolean;
  permission: NotificationPermission | "unsupported";
  pushSubscribed: boolean;
}> {
  let audioReady: boolean;
  if (isAudio4SpikeEnabled()) {
    const prepared = await prepareCustomerReadyAudioFromGesture();
    audioReady = prepared.audioContextReady || prepared.bufferReady;
  } else {
    audioReady = await unlockCustomerReadyAudioFromGesture();
  }
  const permission = await requestReadyNotificationPermissionFromGesture();

  let pushSubscribed = false;
  if (permission === "granted" && options.trackingToken && options.slug) {
    const pushResult = await subscribeCustomerPush({
      trackingToken: options.trackingToken,
      slug: options.slug,
    });
    pushSubscribed = pushResult.subscribed;
  }

  return { audioReady, permission, pushSubscribed };
}

export function vibrateForReady(durationMs: number): boolean {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      return navigator.vibrate(durationMs);
    }
  } catch {
    /* unsupported */
  }
  return false;
}

export type ReadyNotificationCopy = {
  title: string;
  body: string;
};

export function buildReadyNotificationCopy(
  orderNumber: string,
  language: "ar" | "en"
): ReadyNotificationCopy {
  return {
    title: language === "ar" ? "طلبك جاهز" : "Your order is ready",
    body: orderNumber,
  };
}

export function showReadySystemNotification(
  trackingToken: string,
  tier: ReadyAlertTier,
  copy: ReadyNotificationCopy
): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const notification = new Notification(copy.title, {
      body: copy.body,
      tag: `mineuqr-ready-${trackingToken}-${tier}`,
    });
    notification.onclick = () => {
      acknowledgeReadyAlerts(trackingToken);
      window.focus();
    };
    return true;
  } catch {
    return false;
  }
}

export type ReadyAlertDelivery = {
  sound: boolean;
  notification: boolean;
  vibrate: boolean;
};

export function deliverReadyAlertTier(options: {
  trackingToken: string;
  tier: ReadyAlertTier;
  orderNumber: string;
  language: "ar" | "en";
  alertsActivated: boolean;
}): ReadyAlertDelivery {
  if (!options.alertsActivated) {
    const skipped: ReadyAlertDelivery = { sound: false, notification: false, vibrate: false };
    logReadyAlertDelivery(options.trackingToken, options.tier, skipped, {
      alertsActivated: false,
      skipped: true,
    });
    return skipped;
  }

  const intensity = options.tier === 1 ? "high" : "medium";
  const vibrateMs = options.tier === 1 ? 2000 : 1000;
  const copy = buildReadyNotificationCopy(options.orderNumber, options.language);
  const session = loadReadyAlertState(options.trackingToken);
  const skipPageNotification = session.pushSubscriptionActive;

  const delivery: ReadyAlertDelivery = {
    sound: playCustomerAlertSound(intensity),
    notification: skipPageNotification
      ? false
      : showReadySystemNotification(options.trackingToken, options.tier, copy),
    vibrate: vibrateForReady(vibrateMs),
  };

  logReadyAlertDelivery(options.trackingToken, options.tier, delivery, {
    alertsActivated: true,
  });

  return delivery;
}

export function wasReadyAlertDelivered(delivery: ReadyAlertDelivery): boolean {
  return delivery.sound || delivery.notification || delivery.vibrate;
}

export function acknowledgeReadyAlerts(trackingToken: string): void {
  if (!trackingToken) return;
  const timer = followUpTimers.get(trackingToken);
  if (timer) {
    clearTimeout(timer);
    followUpTimers.delete(trackingToken);
  }
  const state = loadReadyAlertState(trackingToken);
  if (state.acknowledged) return;
  saveReadyAlertState(trackingToken, { ...state, acknowledged: true });
}

export function clearReadyAlertFollowUpTimer(trackingToken: string): void {
  const timer = followUpTimers.get(trackingToken);
  if (timer) {
    clearTimeout(timer);
    followUpTimers.delete(trackingToken);
  }
}

export function scheduleReadyAlertFollowUp(
  trackingToken: string,
  onFire: () => void
): void {
  clearReadyAlertFollowUpTimer(trackingToken);
  const timer = setTimeout(() => {
    followUpTimers.delete(trackingToken);
    onFire();
  }, READY_ALERT_FOLLOW_UP_MS);
  followUpTimers.set(trackingToken, timer);
}

/** For tests — reset module timers. */
export function resetReadyAlertFollowUpTimersForTests(): void {
  followUpTimers.forEach((timer) => clearTimeout(timer));
  followUpTimers.clear();
}

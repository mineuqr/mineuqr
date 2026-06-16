/**
 * CUSTOMER-UX-1C — Ready notification infrastructure (client-only).
 * HOTFIX-1: gesture activation, per-channel delivery reporting.
 */

import { playCustomerAlertSound } from "@/lib/notificationSound";
import { isCustomerPushSupported, subscribeCustomerPush } from "@/lib/customerPush";
import {
  getPushSubscribeTraceSnapshot,
  getPushSupportSnapshot,
  recordPushSubscribeFailure,
  recordPushSubscribeStage,
  resetPushSubscribeTrace,
} from "@/lib/customerPushDiagnostics";
import {
  isIosWebKitTabWithoutPush,
  resolvePushSubscriptionState,
  type PushActivationDiagnostics,
  type PushSubscribeOutcomeReason,
  type PushSubscriptionState,
} from "@/lib/pushSubscriptionState";
import {
  logAlert1SentPersisted,
  logReadyAlertDelivery,
  logReadyAlertDeliverySkipped,
  logReadyAlertDeliverySucceeded,
  logReadyAlertRecoveryAttempt,
  logReadyTransitionDetected,
} from "@/lib/readyNotificationDiagnostics";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";

export const READY_ALERT_FOLLOW_UP_MS = 30_000;

export type ReadyAlertSessionState = {
  alertsActivated: boolean;
  pushSubscriptionActive: boolean;
  pushSubscriptionState?: PushSubscriptionState;
  alert1Sent: boolean;
  alert1NotificationDelivered: boolean;
  alert2Sent: boolean;
  alert2NotificationDelivered: boolean;
  acknowledged: boolean;
  lastStatus?: OrderLifecycleStatus;
  /** True after a preparing/pending → ready transition has been processed once. */
  readyEventHandled?: boolean;
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
      pushSubscriptionState: parsed.pushSubscriptionState,
      alert1Sent: Boolean(parsed.alert1Sent),
      alert1NotificationDelivered: Boolean(parsed.alert1NotificationDelivered),
      alert2Sent: Boolean(parsed.alert2Sent),
      alert2NotificationDelivered: Boolean(parsed.alert2NotificationDelivered),
      acknowledged: Boolean(parsed.acknowledged),
      lastStatus: parsed.lastStatus,
      readyEventHandled: Boolean(parsed.readyEventHandled),
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

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** HOTFIX-1A + BACKGROUND-NOTIFICATIONS-1A + PUSH-SUBSCRIPTION-HARDENING-1 */
export async function activateReadyAlertsFromGesture(options: {
  trackingToken: string;
  slug: string;
}): Promise<{
  audioReady: boolean;
  permissionBefore: NotificationPermission | "unsupported";
  permission: NotificationPermission | "unsupported";
  pushSubscribed: boolean;
  pushSubscribeReason: PushSubscribeOutcomeReason;
  pushSubscriptionState: PushSubscriptionState;
  diagnostics: PushActivationDiagnostics;
}> {
  resetPushSubscribeTrace();
  recordPushSubscribeStage("activation_started", {
    trackingToken: options.trackingToken.slice(0, 8) + "…",
    slug: options.slug,
  });

  const support = getPushSupportSnapshot();
  const permissionBefore = readNotificationPermission();
  const isIosSafariTab = isIosWebKitTabWithoutPush();

  recordPushSubscribeStage("permission_before", { permission: permissionBefore });

  // NOTIFICATION-AUDIO-CLEANUP-1: activation is enrollment-only — no audio unlock,
  // HTML warmup play(), buffer decode, or keep-alive (those register iOS Now Playing).
  const audioReady = false;

  const permission = await requestReadyNotificationPermissionFromGesture();

  recordPushSubscribeStage("permission_after", { permission });

  let pushSubscribed = false;
  let pushSubscribeReason: PushSubscribeOutcomeReason = "skipped_permission";

  if (!isCustomerPushSupported()) {
    pushSubscribeReason = "unsupported";
    recordPushSubscribeFailure("unsupported", { support });
  } else if (permission !== "granted" || !options.trackingToken || !options.slug) {
    pushSubscribeReason = "skipped_permission";
    recordPushSubscribeFailure("skipped_permission", {
      permission,
      hasTrackingToken: Boolean(options.trackingToken),
      hasSlug: Boolean(options.slug),
    });
  } else {
    const pushResult = await subscribeCustomerPush({
      trackingToken: options.trackingToken,
      slug: options.slug,
    });
    pushSubscribed = pushResult.subscribed;
    pushSubscribeReason = pushResult.subscribed
      ? "success"
      : (pushResult.reason ?? "subscription_failed");
  }

  const enrollmentTrace = getPushSubscribeTraceSnapshot();

  const pushSubscriptionState = resolvePushSubscriptionState({
    pushSubscribed,
    permission,
    pushSubscribeReason,
    support,
  });

  const diagnostics: PushActivationDiagnostics = {
    permissionBefore,
    permissionAfter: permission,
    support,
    pushSubscribed,
    pushSubscribeReason,
    pushSubscriptionState,
    isIosSafariTab,
    enrollmentTrace,
    subscriptionId: enrollmentTrace.subscriptionId,
  };

  return {
    audioReady,
    permissionBefore,
    permission,
    pushSubscribed,
    pushSubscribeReason,
    pushSubscriptionState,
    diagnostics,
  };
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

export type ReadyTier1HandleResult = {
  delivered: boolean;
  delivery: ReadyAlertDelivery;
  alert1Sent: boolean;
};

export function handleReadyTier1Delivery(options: {
  trackingToken: string;
  orderNumber: string;
  language: "ar" | "en";
  status: OrderLifecycleStatus;
  source: "transition" | "recovery";
  previousStatus?: OrderLifecycleStatus | null;
}): ReadyTier1HandleResult {
  const session = loadReadyAlertState(options.trackingToken);
  const emptyDelivery: ReadyAlertDelivery = {
    sound: false,
    notification: false,
    vibrate: false,
  };

  if (session.alert1Sent) {
    return { delivered: false, delivery: emptyDelivery, alert1Sent: true };
  }

  if (options.source === "transition") {
    logReadyTransitionDetected(
      options.trackingToken,
      options.previousStatus ?? null,
      options.status
    );
  } else {
    logReadyAlertRecoveryAttempt(options.trackingToken, {
      lastStatus: session.lastStatus,
      alertsActivated: session.alertsActivated,
      alert1Sent: session.alert1Sent,
    });
  }

  const delivery = deliverReadyAlertTier({
    trackingToken: options.trackingToken,
    tier: 1,
    orderNumber: options.orderNumber,
    language: options.language,
    alertsActivated:
      options.source === "transition" ? true : session.alertsActivated,
  });

  if (!wasReadyAlertDelivered(delivery)) {
    logReadyAlertDeliverySkipped(
      options.trackingToken,
      1,
      session.alertsActivated ? "no_channel_delivered" : "alertsActivated_false",
      delivery,
      { alertsActivated: session.alertsActivated, source: options.source }
    );
    saveReadyAlertState(options.trackingToken, {
      ...session,
      lastStatus: options.status,
      readyEventHandled: options.source === "transition" ? true : session.readyEventHandled,
    });
    return { delivered: false, delivery, alert1Sent: false };
  }

  logReadyAlertDeliverySucceeded(options.trackingToken, 1, delivery, {
    source: options.source,
  });
  saveReadyAlertState(options.trackingToken, {
    ...session,
    alert1Sent: true,
    alert1NotificationDelivered: delivery.notification,
    lastStatus: options.status,
    readyEventHandled: true,
  });
  logAlert1SentPersisted(options.trackingToken, {
    source: options.source,
    notificationDelivered: delivery.notification,
  });

  return { delivered: true, delivery, alert1Sent: true };
}

/** Not invoked from customer activation — transition-only recovery helper. */
export function deliverMissedReadyTier1IfNeeded(options: {
  trackingToken: string;
  orderNumber: string;
  language: "ar" | "en";
  currentStatus: OrderLifecycleStatus;
}): ReadyTier1HandleResult | null {
  if (options.currentStatus !== "ready") return null;

  const session = loadReadyAlertState(options.trackingToken);
  if (!session.alertsActivated || session.alert1Sent || session.readyEventHandled) return null;
  if (session.lastStatus !== "ready") return null;

  return handleReadyTier1Delivery({
    trackingToken: options.trackingToken,
    orderNumber: options.orderNumber,
    language: options.language,
    status: options.currentStatus,
    source: "recovery",
  });
}

export function handleReadyTier2Delivery(options: {
  trackingToken: string;
  orderNumber: string;
  language: "ar" | "en";
}): ReadyAlertDelivery {
  const latest = loadReadyAlertState(options.trackingToken);
  if (latest.acknowledged || latest.alert2Sent) {
    return { sound: false, notification: false, vibrate: false };
  }

  const delivery = deliverReadyAlertTier({
    trackingToken: options.trackingToken,
    tier: 2,
    orderNumber: options.orderNumber,
    language: options.language,
    alertsActivated: true,
  });

  if (wasReadyAlertDelivered(delivery)) {
    logReadyAlertDeliverySucceeded(options.trackingToken, 2, delivery);
    saveReadyAlertState(options.trackingToken, {
      ...latest,
      alert2Sent: true,
      alert2NotificationDelivered: delivery.notification,
      lastStatus: "ready",
    });
  } else {
    logReadyAlertDeliverySkipped(
      options.trackingToken,
      2,
      "no_channel_delivered",
      delivery,
      { alertsActivated: true, source: "transition" }
    );
  }

  return delivery;
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

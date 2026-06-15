/**
 * PUSH-SUBSCRIPTION-HARDENING-1 — explicit background push subscription states.
 */

import type { PushSubscribeFailureReason } from "@/lib/customerPush";
import {
  getPushSupportSnapshot,
  type PushEnrollmentTrace,
  type PushSupportSnapshot,
} from "@/lib/customerPushDiagnostics";

export const PUSH_SUBSCRIPTION_BUILD = "PUSH-SUBSCRIPTION-HARDENING-1";

export type PushSubscriptionState =
  | "NOT_SUPPORTED"
  | "PERMISSION_REQUIRED"
  | "PERMISSION_DENIED"
  | "SUBSCRIBING"
  | "SUBSCRIBED"
  | "SUBSCRIBE_FAILED";

export type PushSubscribeOutcomeReason =
  | PushSubscribeFailureReason
  | "success"
  | "skipped_permission";

export type PushActivationDiagnostics = {
  permissionBefore: NotificationPermission | "unsupported";
  permissionAfter: NotificationPermission | "unsupported";
  support: PushSupportSnapshot;
  pushSubscribed: boolean;
  pushSubscribeReason: PushSubscribeOutcomeReason | null;
  pushSubscriptionState: PushSubscriptionState;
  isIosSafariTab: boolean;
  enrollmentTrace: PushEnrollmentTrace;
  subscriptionId: number | null;
};

export function isIosWebKitTabWithoutPush(): boolean {
  if (typeof navigator === "undefined") return false;
  const snap = getPushSupportSnapshot();
  const isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  return isIos && !snap.iosStandalone && !snap.displayModeStandalone && !snap.pushManager;
}

export function detectInitialPushSubscriptionState(options: {
  pushSubscriptionActive: boolean;
  support?: PushSupportSnapshot;
}): PushSubscriptionState {
  if (options.pushSubscriptionActive) return "SUBSCRIBED";

  const support = options.support ?? getPushSupportSnapshot();
  if (!support.serviceWorker || !support.pushManager || !support.notification) {
    return "NOT_SUPPORTED";
  }
  if (support.permission === "denied") return "PERMISSION_DENIED";
  if (support.permission === "default") return "PERMISSION_REQUIRED";
  return "PERMISSION_REQUIRED";
}

export function resolvePushSubscriptionState(options: {
  pushSubscribed: boolean;
  permission: NotificationPermission | "unsupported";
  pushSubscribeReason?: PushSubscribeOutcomeReason | null;
  support?: PushSupportSnapshot;
}): PushSubscriptionState {
  if (options.pushSubscribed) return "SUBSCRIBED";

  const support = options.support ?? getPushSupportSnapshot();
  const reason = options.pushSubscribeReason ?? null;

  if (reason === "unsupported" || !support.pushManager || !support.serviceWorker || !support.notification) {
    return "NOT_SUPPORTED";
  }

  if (
    reason === "skipped_permission" ||
    options.permission === "denied" ||
    reason === "permission_denied"
  ) {
    return options.permission === "default" ? "PERMISSION_REQUIRED" : "PERMISSION_DENIED";
  }

  if (options.permission === "default" || options.permission === "unsupported") {
    return "PERMISSION_REQUIRED";
  }

  if (options.permission !== "granted") {
    return "PERMISSION_DENIED";
  }

  if (
    reason === "not_configured" ||
    reason === "service_worker_failed" ||
    reason === "subscription_failed" ||
    reason === "invalid_subscription" ||
    reason === "subscribe_api_failed"
  ) {
    return "SUBSCRIBE_FAILED";
  }

  return "SUBSCRIBE_FAILED";
}

export function isBackgroundPushReady(state: PushSubscriptionState): boolean {
  return state === "SUBSCRIBED";
}

type MessageCopy = { ar: string; en: string };

const FAILURE_MESSAGES: Record<PushSubscribeFailureReason | "skipped_permission", MessageCopy> = {
  unsupported: {
    en: "Notifications are not supported on this device.",
    ar: "الإشعارات غير مدعومة على هذا الجهاز.",
  },
  permission_denied: {
    en: "Please allow notifications first.",
    ar: "يرجى السماح بالإشعارات أولاً.",
  },
  skipped_permission: {
    en: "Please allow notifications first.",
    ar: "يرجى السماح بالإشعارات أولاً.",
  },
  not_configured: {
    en: "Push notifications are not configured on the server.",
    ar: "إشعارات الدفع غير مفعّلة على الخادم.",
  },
  service_worker_failed: {
    en: "Service Worker registration failed.",
    ar: "فشل تسجيل Service Worker.",
  },
  subscription_failed: {
    en: "Failed to create push subscription.",
    ar: "فشل إنشاء اشتراك الإشعارات.",
  },
  invalid_subscription: {
    en: "Failed to create push subscription.",
    ar: "فشل إنشاء اشتراك الإشعارات.",
  },
  subscribe_api_failed: {
    en: "Failed to save push subscription.",
    ar: "فشل حفظ اشتراك الإشعارات.",
  },
};

export function getPushSubscriptionUserMessage(options: {
  state: PushSubscriptionState;
  language: "ar" | "en";
  pushSubscribeReason?: PushSubscribeOutcomeReason | null;
}): string {
  const lang = options.language;
  const { state } = options;
  const reason = options.pushSubscribeReason ?? null;

  if (state === "SUBSCRIBED") {
    return lang === "ar" ? "إشعارات الخلفية جاهزة" : "Background push ready";
  }
  if (state === "SUBSCRIBING") {
    return lang === "ar" ? "جاري تفعيل إشعارات الخلفية..." : "Enabling background push...";
  }
  if (state === "PERMISSION_REQUIRED") {
    return lang === "ar"
      ? "اسمح بالإشعارات لتلقي تنبيهات الخلفية عندما يصبح طلبك جاهزاً."
      : "Allow notifications to receive background alerts when your order is ready.";
  }
  if (state === "PERMISSION_DENIED") {
    return FAILURE_MESSAGES.skipped_permission[lang];
  }
  if (state === "NOT_SUPPORTED") {
    return FAILURE_MESSAGES.unsupported[lang];
  }
  if (state === "SUBSCRIBE_FAILED" && reason && reason !== "success" && reason in FAILURE_MESSAGES) {
    return FAILURE_MESSAGES[reason as keyof typeof FAILURE_MESSAGES][lang];
  }
  return lang === "ar" ? "إشعارات الخلفية غير جاهزة" : "Background push not ready";
}

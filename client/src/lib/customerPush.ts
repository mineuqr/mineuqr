/**
 * BACKGROUND-NOTIFICATIONS-1A — customer Web Push client helpers.
 * TRUE-PUSH-VALIDATION-1 — trace instrumentation + granular failure reasons.
 */

import {
  getPushSupportSnapshot,
  logPushTrace,
} from "@/lib/customerPushDiagnostics";

const SW_URL = "/sw.js";
const SW_SCOPE = "/";

export type PushSubscribeFailureReason =
  | "unsupported"
  | "permission_denied"
  | "not_configured"
  | "service_worker_failed"
  | "subscription_failed"
  | "invalid_subscription"
  | "subscribe_api_failed";

export type PushSubscribeResult = {
  subscribed: boolean;
  subscriptionId?: number;
  reason?: PushSubscribeFailureReason;
  httpStatus?: number;
  errorMessage?: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isCustomerPushSupported(): boolean {
  const snapshot = getPushSupportSnapshot();
  return snapshot.serviceWorker && snapshot.pushManager && snapshot.notification;
}

export async function registerCustomerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    logPushTrace("service worker registration skipped", { reason: "no_service_worker_api" });
    return null;
  }
  try {
    logPushTrace("service worker register start", { swUrl: SW_URL, scope: SW_SCOPE });
    await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    const registration = await navigator.serviceWorker.ready;
    logPushTrace("service worker registration state", {
      scope: registration.scope,
      active: Boolean(registration.active),
      installing: Boolean(registration.installing),
      waiting: Boolean(registration.waiting),
      pushManager: "pushManager" in registration,
    });
    return registration;
  } catch (err) {
    logPushTrace("service worker registration failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function fetchVapidPublicKey(): Promise<string | null> {
  logPushTrace("vapid public key fetch start");
  try {
    const res = await fetch("/api/push/vapid-public-key");
    logPushTrace("vapid public key fetch response", { ok: res.ok, status: res.status });
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch (err) {
    logPushTrace("vapid public key fetch failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function subscribeCustomerPush(options: {
  trackingToken: string;
  slug: string;
}): Promise<PushSubscribeResult> {
  logPushTrace("subscribeCustomerPush entered", {
    slug: options.slug,
    trackingToken: options.trackingToken.slice(0, 8) + "…",
  });

  const support = getPushSupportSnapshot();
  logPushTrace("support detection result", support);

  if (!isCustomerPushSupported()) {
    logPushTrace("subscribe aborted", { reason: "unsupported", support });
    return { subscribed: false, reason: "unsupported" };
  }

  logPushTrace("permission result", { permission: support.permission });
  if (Notification.permission !== "granted") {
    logPushTrace("subscribe aborted", { reason: "permission_denied" });
    return { subscribed: false, reason: "permission_denied" };
  }

  const vapidPublicKey = await fetchVapidPublicKey();
  if (!vapidPublicKey) {
    logPushTrace("subscribe aborted", { reason: "not_configured" });
    return { subscribed: false, reason: "not_configured" };
  }
  logPushTrace("vapid public key loaded", { keyLength: vapidPublicKey.length });

  const registration = await registerCustomerServiceWorker();
  if (!registration) {
    logPushTrace("subscribe aborted", { reason: "service_worker_failed" });
    return { subscribed: false, reason: "service_worker_failed" };
  }

  logPushTrace("PushManager available", {
    available: "pushManager" in registration,
  });

  try {
    let subscription = await registration.pushManager.getSubscription();
    logPushTrace("existing push subscription lookup", {
      found: Boolean(subscription),
      endpoint: subscription?.endpoint ? subscription.endpoint.slice(0, 48) + "…" : null,
    });

    if (!subscription) {
      logPushTrace("pushManager.subscribe start");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      logPushTrace("pushManager.subscribe success", {
        endpoint: subscription.endpoint.slice(0, 48) + "…",
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      logPushTrace("subscribe aborted", { reason: "invalid_subscription" });
      return { subscribed: false, reason: "invalid_subscription" };
    }

    logPushTrace("subscription object created", {
      endpoint: json.endpoint.slice(0, 48) + "…",
      hasP256dh: Boolean(json.keys.p256dh),
      hasAuth: Boolean(json.keys.auth),
    });

    logPushTrace("POST /api/push/subscribe sent");
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingToken: options.trackingToken,
        slug: options.slug,
        subscription: {
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
        },
      }),
    });

    const responseBody = await res.text();
    logPushTrace("POST /api/push/subscribe response", {
      ok: res.ok,
      status: res.status,
      bodyPreview: responseBody.slice(0, 200),
    });

    if (!res.ok) {
      return {
        subscribed: false,
        reason: "subscribe_api_failed",
        httpStatus: res.status,
        errorMessage: responseBody.slice(0, 200),
      };
    }

    let subscriptionId: number | undefined;
    try {
      const data = JSON.parse(responseBody) as { subscriptionId?: number };
      subscriptionId = data.subscriptionId;
    } catch {
      /* response ok but unexpected shape */
    }

    logPushTrace("subscribeCustomerPush success", { subscriptionId });
    return { subscribed: true, subscriptionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logPushTrace("subscribe aborted", { reason: "subscription_failed", message });
    return { subscribed: false, reason: "subscription_failed", errorMessage: message };
  }
}

export async function unsubscribeCustomerPush(options: {
  trackingToken: string;
  slug: string;
}): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingToken: options.trackingToken,
        slug: options.slug,
        endpoint,
      }),
    });

    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

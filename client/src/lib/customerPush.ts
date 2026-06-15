/**
 * BACKGROUND-NOTIFICATIONS-1A — customer Web Push client helpers.
 * SUBSCRIPTION-VALIDATION-1 — staged enrollment diagnostics.
 */

import {
  getPushSupportSnapshot,
  recordPushSubscribeFailure,
  recordPushSubscribeStage,
  recordPushSubscribeSuccess,
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

const SW_READY_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_timeout_${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function registerCustomerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    recordPushSubscribeStage("sw_registration_failed", { reason: "no_service_worker_api" });
    recordPushSubscribeFailure("service_worker_failed");
    return null;
  }
  try {
    recordPushSubscribeStage("sw_registration_started", { swUrl: SW_URL, scope: SW_SCOPE });
    await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    const registration = await withTimeout(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      "service_worker_ready"
    );
    recordPushSubscribeStage("sw_registration_success", {
      scope: registration.scope,
      active: Boolean(registration.active),
      pushManager: "pushManager" in registration,
    });
    return registration;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordPushSubscribeStage("sw_registration_failed", { message });
    recordPushSubscribeFailure("service_worker_failed", { message });
    return null;
  }
}

async function fetchVapidPublicKey(): Promise<string | null> {
  recordPushSubscribeStage("vapid_fetch_started");
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) {
      recordPushSubscribeStage("vapid_fetch_failed", { status: res.status });
      recordPushSubscribeFailure("not_configured", { httpStatus: res.status });
      return null;
    }
    const data = (await res.json()) as { publicKey?: string };
    const publicKey = data.publicKey ?? null;
    if (!publicKey) {
      recordPushSubscribeStage("vapid_fetch_failed", { reason: "missing_public_key" });
      recordPushSubscribeFailure("not_configured");
      return null;
    }
    recordPushSubscribeStage("vapid_fetch_success", { keyLength: publicKey.length });
    return publicKey;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordPushSubscribeStage("vapid_fetch_failed", { message });
    recordPushSubscribeFailure("not_configured", { message });
    return null;
  }
}

export async function subscribeCustomerPush(options: {
  trackingToken: string;
  slug: string;
}): Promise<PushSubscribeResult> {
  const support = getPushSupportSnapshot();
  recordPushSubscribeStage("support_check", support);

  if (!isCustomerPushSupported()) {
    recordPushSubscribeFailure("unsupported", { support });
    return { subscribed: false, reason: "unsupported" };
  }

  if (Notification.permission !== "granted") {
    recordPushSubscribeFailure("permission_denied", { permission: support.permission });
    return { subscribed: false, reason: "permission_denied" };
  }

  const vapidPublicKey = await fetchVapidPublicKey();
  if (!vapidPublicKey) {
    return { subscribed: false, reason: "not_configured" };
  }

  const registration = await registerCustomerServiceWorker();
  if (!registration) {
    return { subscribed: false, reason: "service_worker_failed" };
  }

  try {
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      recordPushSubscribeStage("push_subscribe_started");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      recordPushSubscribeStage("push_subscribe_success", {
        endpoint: subscription.endpoint.slice(0, 48) + "…",
      });
    } else {
      recordPushSubscribeStage("push_subscribe_success", {
        endpoint: subscription.endpoint.slice(0, 48) + "…",
        reused: true,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      recordPushSubscribeFailure("invalid_subscription");
      return { subscribed: false, reason: "invalid_subscription" };
    }

    recordPushSubscribeStage("subscribe_api_started", {
      trackingToken: options.trackingToken.slice(0, 8) + "…",
      slug: options.slug,
    });

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

    if (!res.ok) {
      recordPushSubscribeStage("subscribe_api_failed", {
        status: res.status,
        bodyPreview: responseBody.slice(0, 200),
      });
      recordPushSubscribeFailure("subscribe_api_failed", {
        httpStatus: res.status,
        bodyPreview: responseBody.slice(0, 200),
      });
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

    recordPushSubscribeSuccess({ subscriptionId, httpStatus: res.status });
    return { subscribed: true, subscriptionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordPushSubscribeStage("push_subscribe_failed", { message });
    recordPushSubscribeFailure("subscription_failed", { message });
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

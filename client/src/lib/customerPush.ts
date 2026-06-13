/**
 * BACKGROUND-NOTIFICATIONS-1A — customer Web Push client helpers.
 */

const SW_URL = "/sw.js";
const SW_SCOPE = "/";

export type PushSubscribeResult = {
  subscribed: boolean;
  subscriptionId?: number;
  reason?: "unsupported" | "permission_denied" | "not_configured" | "error";
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
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerCustomerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  } catch {
    return null;
  }
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

export async function subscribeCustomerPush(options: {
  trackingToken: string;
  slug: string;
}): Promise<PushSubscribeResult> {
  if (!isCustomerPushSupported()) {
    return { subscribed: false, reason: "unsupported" };
  }
  if (Notification.permission !== "granted") {
    return { subscribed: false, reason: "permission_denied" };
  }

  const vapidPublicKey = await fetchVapidPublicKey();
  if (!vapidPublicKey) {
    return { subscribed: false, reason: "not_configured" };
  }

  const registration = await registerCustomerServiceWorker();
  if (!registration) {
    return { subscribed: false, reason: "error" };
  }

  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { subscribed: false, reason: "error" };
    }

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

    if (!res.ok) {
      return { subscribed: false, reason: "error" };
    }

    const data = (await res.json()) as { subscriptionId?: number };
    return { subscribed: true, subscriptionId: data.subscriptionId };
  } catch {
    return { subscribed: false, reason: "error" };
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

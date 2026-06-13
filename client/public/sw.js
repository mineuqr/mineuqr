/* BACKGROUND-NOTIFICATIONS-1A — customer READY Web Push service worker */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = payload.title || "MineuQR";
  const body = payload.body || "";
  const trackingToken = payload.trackingToken || "";
  const tier = payload.tier || 1;
  const url = payload.url || "/";

  const options = {
    body,
    icon: "/mineuqr-logo.png",
    badge: "/mineuqr-logo.png",
    tag: trackingToken ? `mineuqr-ready-${trackingToken}-${tier}` : "mineuqr-ready",
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

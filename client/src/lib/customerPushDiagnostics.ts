/**
 * TRUE-PUSH-VALIDATION-1 — customer push subscription trace logging.
 * Enable: ?pushTrace=1 or sessionStorage mineuqr:push:trace=1
 */

export const PUSH_TRACE_BUILD = "TRUE-PUSH-VALIDATION-1";

export type PushSupportSnapshot = {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  displayModeStandalone: boolean;
  iosStandalone: boolean;
  permission: NotificationPermission | "unsupported";
};

export function isPushTraceEnabled(): boolean {
  if (import.meta.env.DEV && import.meta.env.VITE_PUSH_TRACE === "1") {
    return true;
  }
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("pushTrace")) return true;
    return sessionStorage.getItem("mineuqr:push:trace") === "1";
  } catch {
    return false;
  }
}

export function getPushSupportSnapshot(): PushSupportSnapshot {
  if (typeof window === "undefined") {
    return {
      serviceWorker: false,
      pushManager: false,
      notification: false,
      displayModeStandalone: false,
      iosStandalone: false,
      permission: "unsupported",
    };
  }

  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  const hasNotification = typeof Notification !== "undefined";

  return {
    serviceWorker: "serviceWorker" in navigator,
    pushManager: typeof window !== "undefined" && "PushManager" in window,
    notification: hasNotification,
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone,
    permission: hasNotification ? Notification.permission : "unsupported",
  };
}

export function logPushTrace(message: string, metadata?: Record<string, unknown>): void {
  if (!isPushTraceEnabled()) return;
  const payload = { build: PUSH_TRACE_BUILD, ...metadata };
  if (metadata) {
    console.info(`[mineuqr:push] ${message}`, payload);
  } else {
    console.info(`[mineuqr:push] ${message}`, { build: PUSH_TRACE_BUILD });
  }
}

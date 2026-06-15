/**
 * SUBSCRIPTION-VALIDATION-1 — staged push enrollment trace.
 * Enable: ?pushTrace=1 or sessionStorage mineuqr:push:trace=1
 */

export const PUSH_TRACE_BUILD = "SUBSCRIPTION-VALIDATION-1";

export type PushSupportSnapshot = {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  displayModeStandalone: boolean;
  iosStandalone: boolean;
  permission: NotificationPermission | "unsupported";
};

/** SV-1 — canonical enrollment stages */
export type PushSubscribeTraceStage =
  | "activation_started"
  | "permission_before"
  | "permission_after"
  | "support_check"
  | "vapid_fetch_started"
  | "vapid_fetch_success"
  | "vapid_fetch_failed"
  | "sw_registration_started"
  | "sw_registration_success"
  | "sw_registration_failed"
  | "push_subscribe_started"
  | "push_subscribe_success"
  | "push_subscribe_failed"
  | "subscribe_api_started"
  | "subscribe_api_success"
  | "subscribe_api_failed"
  | "enrollment_complete";

/** SV-4 — terminal failure reasons */
export type PushSubscribeFailureStage =
  | "unsupported"
  | "permission_denied"
  | "skipped_permission"
  | "not_configured"
  | "service_worker_failed"
  | "subscription_failed"
  | "invalid_subscription"
  | "subscribe_api_failed";

export type PushEnrollmentTrace = {
  stages: PushSubscribeTraceStage[];
  lastStage: PushSubscribeTraceStage | null;
  failureStage: PushSubscribeFailureStage | null;
  pushSubscribed: boolean;
  subscriptionId: number | null;
  httpStatus: number | null;
};

const emptyTrace = (): PushEnrollmentTrace => ({
  stages: [],
  lastStage: null,
  failureStage: null,
  pushSubscribed: false,
  subscriptionId: null,
  httpStatus: null,
});

let enrollmentTrace: PushEnrollmentTrace = emptyTrace();

export function resetPushSubscribeTrace(): void {
  enrollmentTrace = emptyTrace();
}

export function getPushSubscribeTraceSnapshot(): PushEnrollmentTrace {
  return { ...enrollmentTrace, stages: [...enrollmentTrace.stages] };
}

export function recordPushSubscribeStage(
  stage: PushSubscribeTraceStage,
  metadata?: Record<string, unknown>
): void {
  enrollmentTrace.stages.push(stage);
  enrollmentTrace.lastStage = stage;
  if (stage === "enrollment_complete") {
    enrollmentTrace.pushSubscribed = true;
  }
  logPushTrace(stage, metadata);
}

export function recordPushSubscribeFailure(
  failureStage: PushSubscribeFailureStage,
  metadata?: Record<string, unknown>
): void {
  enrollmentTrace.failureStage = failureStage;
  logPushTrace("enrollment_failed", { failureStage, ...metadata });
}

export function recordPushSubscribeSuccess(options: {
  subscriptionId?: number;
  httpStatus?: number;
}): void {
  enrollmentTrace.pushSubscribed = true;
  enrollmentTrace.subscriptionId = options.subscriptionId ?? null;
  enrollmentTrace.httpStatus = options.httpStatus ?? null;
  enrollmentTrace.failureStage = null;
  recordPushSubscribeStage("subscribe_api_success", {
    subscriptionId: options.subscriptionId ?? null,
    httpStatus: options.httpStatus ?? null,
  });
  recordPushSubscribeStage("enrollment_complete", {
    subscriptionId: options.subscriptionId ?? null,
  });
}

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

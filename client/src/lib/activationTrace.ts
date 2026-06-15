/**
 * ACTIVATION-TRACE-1 — temporary enrollment UI diagnostics.
 * Enable: ?activationTrace=1 or ?pushTrace=1 or sessionStorage mineuqr:activation:trace=1
 */

export const ACTIVATION_TRACE_BUILD = "ACTIVATION-TRACE-1";

export type ActivationTraceStage =
  | "onclick_fired"
  | "activate_alerts_entered"
  | "activate_alerts_early_return"
  | "activate_alerts_started"
  | "activation_gesture_resolved"
  | "activate_alerts_success"
  | "activate_alerts_error"
  | "ui_enrollment_complete";

export type ActivationTraceSnapshot = {
  stages: ActivationTraceStage[];
  lastStage: ActivationTraceStage | null;
  lastMetadata: Record<string, unknown> | null;
  enrollmentComplete: boolean;
  pushSubscribed: boolean;
  permission: NotificationPermission | "unsupported" | null;
  pushSubscriptionState: string | null;
  errorMessage: string | null;
};

const STORAGE_KEY = "mineuqr:activation:trace:snapshot";

let snapshot: ActivationTraceSnapshot = {
  stages: [],
  lastStage: null,
  lastMetadata: null,
  enrollmentComplete: false,
  pushSubscribed: false,
  permission: null,
  pushSubscriptionState: null,
  errorMessage: null,
};

export function isActivationTraceEnabled(): boolean {
  if (import.meta.env.DEV && import.meta.env.VITE_ACTIVATION_TRACE === "1") {
    return true;
  }
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("activationTrace") || params.has("pushTrace")) return true;
    return sessionStorage.getItem("mineuqr:activation:trace") === "1";
  } catch {
    return false;
  }
}

function persistSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function resetActivationTrace(): void {
  snapshot = {
    stages: [],
    lastStage: null,
    lastMetadata: null,
    enrollmentComplete: false,
    pushSubscribed: false,
    permission: null,
    pushSubscriptionState: null,
    errorMessage: null,
  };
  persistSnapshot();
}

export function recordActivationTrace(
  stage: ActivationTraceStage,
  metadata?: Record<string, unknown>
): void {
  snapshot.stages.push(stage);
  snapshot.lastStage = stage;
  snapshot.lastMetadata = metadata ?? null;
  if (metadata?.enrollmentComplete !== undefined) {
    snapshot.enrollmentComplete = Boolean(metadata.enrollmentComplete);
  }
  if (metadata?.pushSubscribed !== undefined) {
    snapshot.pushSubscribed = Boolean(metadata.pushSubscribed);
  }
  if (metadata?.permission !== undefined) {
    snapshot.permission = metadata.permission as ActivationTraceSnapshot["permission"];
  }
  if (metadata?.pushSubscriptionState !== undefined) {
    snapshot.pushSubscriptionState = String(metadata.pushSubscriptionState);
  }
  if (metadata?.errorMessage !== undefined) {
    snapshot.errorMessage = String(metadata.errorMessage);
  }

  if (isActivationTraceEnabled()) {
    console.info(`[mineuqr:activation] ${stage}`, {
      build: ACTIVATION_TRACE_BUILD,
      ...metadata,
    });
  }
  persistSnapshot();
}

export function getActivationTraceSnapshot(): ActivationTraceSnapshot {
  return {
    ...snapshot,
    stages: [...snapshot.stages],
  };
}

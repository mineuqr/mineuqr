import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import {
  getActivationTraceSnapshot,
  recordActivationTrace,
} from "@/lib/activationTrace";
import { logReadyAlertActivation } from "@/lib/readyNotificationDiagnostics";
import {
  detectInitialPushSubscriptionState,
  type PushActivationDiagnostics,
  type PushSubscriptionState,
} from "@/lib/pushSubscriptionState";
import {
  acknowledgeReadyAlerts,
  activateReadyAlertsFromGesture,
  clearReadyAlertFollowUpTimer,
  handleReadyTier1Delivery,
  handleReadyTier2Delivery,
  isReadyTransition,
  loadReadyAlertState,
  saveReadyAlertState,
  scheduleReadyAlertFollowUp,
} from "@/lib/readyNotification";

type UseReadyStatusAlertsOptions = {
  trackingToken: string;
  slug: string;
  status: OrderLifecycleStatus | undefined;
  orderNumber: string | undefined;
  language: "ar" | "en";
  enabled: boolean;
};

function resolveSessionPushState(session: ReturnType<typeof loadReadyAlertState>): PushSubscriptionState {
  if (session.pushSubscriptionActive) return "SUBSCRIBED";
  if (session.pushSubscriptionState) return session.pushSubscriptionState;
  return detectInitialPushSubscriptionState({
    pushSubscriptionActive: session.pushSubscriptionActive,
  });
}

function scheduleTier2IfNeeded(
  trackingToken: string,
  orderNumber: string,
  language: "ar" | "en"
): void {
  scheduleReadyAlertFollowUp(trackingToken, () => {
    handleReadyTier2Delivery({ trackingToken, orderNumber, language });
  });
}

export function useReadyStatusAlerts({
  trackingToken,
  slug,
  status,
  orderNumber,
  language,
  enabled,
}: UseReadyStatusAlertsOptions) {
  const [alertsActivated, setAlertsActivated] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const [pushSubscriptionState, setPushSubscriptionState] =
    useState<PushSubscriptionState>("PERMISSION_REQUIRED");
  const [pushSubscribeReason, setPushSubscribeReason] = useState<
    PushActivationDiagnostics["pushSubscribeReason"] | null
  >(null);
  const [activationDiagnostics, setActivationDiagnostics] =
    useState<PushActivationDiagnostics | null>(null);
  const [activating, setActivating] = useState(false);
  const [notificationDeliveredHint, setNotificationDeliveredHint] = useState(false);
  const prevStatusRef = useRef<OrderLifecycleStatus | null>(null);
  const initializedRef = useRef(false);
  const activatingRef = useRef(false);

  useEffect(() => {
    if (!trackingToken) return;
    const session = loadReadyAlertState(trackingToken);
    const sessionPushState = resolveSessionPushState(session);
    setAlertsActivated(session.alertsActivated);
    setPushSubscriptionState(sessionPushState);
    setEnrollmentComplete(session.alertsActivated || session.pushSubscriptionActive);
    if (session.alert1NotificationDelivered) {
      setNotificationDeliveredHint(true);
    }
  }, [trackingToken]);

  const activateAlerts = useCallback(async () => {
    recordActivationTrace("activate_alerts_entered", {
      trackingToken: trackingToken ? trackingToken.slice(0, 8) + "…" : null,
      slug: slug || null,
      activatingRef: activatingRef.current,
    });

    if (!trackingToken || !slug) {
      recordActivationTrace("activate_alerts_early_return", {
        reason: !trackingToken ? "missing_tracking_token" : "missing_slug",
      });
      return;
    }

    if (activatingRef.current) {
      recordActivationTrace("activate_alerts_early_return", { reason: "already_activating" });
      return;
    }

    activatingRef.current = true;
    setActivating(true);
    recordActivationTrace("activate_alerts_started");

    try {
      const result = await activateReadyAlertsFromGesture({ trackingToken, slug });
      recordActivationTrace("activation_gesture_resolved", {
        permission: result.permission,
        pushSubscribed: result.pushSubscribed,
        pushSubscriptionState: result.pushSubscriptionState,
        pushSubscribeReason: result.pushSubscribeReason,
      });

      logReadyAlertActivation(trackingToken, result);
      setPushSubscriptionState(result.pushSubscriptionState);
      setPushSubscribeReason(result.pushSubscribeReason);
      setActivationDiagnostics(result.diagnostics);

      const permissionGranted = result.permission === "granted";
      const enrollmentSucceeded = permissionGranted || result.pushSubscribed;

      const session = loadReadyAlertState(trackingToken);
      saveReadyAlertState(trackingToken, {
        ...session,
        alertsActivated: enrollmentSucceeded,
        pushSubscriptionActive: result.pushSubscribed,
        pushSubscriptionState: result.pushSubscriptionState,
        ...(status === "ready"
          ? { readyEventHandled: true, lastStatus: status }
          : {}),
      });

      setAlertsActivated(enrollmentSucceeded);
      setEnrollmentComplete(enrollmentSucceeded);

      recordActivationTrace("activate_alerts_success", {
        permission: result.permission,
        pushSubscribed: result.pushSubscribed,
        pushSubscriptionState: result.pushSubscriptionState,
        enrollmentComplete: enrollmentSucceeded,
      });
      recordActivationTrace("ui_enrollment_complete", {
        enrollmentComplete: enrollmentSucceeded,
        pushSubscribed: result.pushSubscribed,
        permission: result.permission,
        pushSubscriptionState: result.pushSubscriptionState,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      recordActivationTrace("activate_alerts_error", { errorMessage: message });

      const fallbackState = detectInitialPushSubscriptionState({
        pushSubscriptionActive: false,
      });
      setPushSubscriptionState(fallbackState);
    } finally {
      activatingRef.current = false;
      setActivating(false);
    }
  }, [trackingToken, slug, status]);

  const acknowledge = useCallback(() => {
    if (!trackingToken) return;
    acknowledgeReadyAlerts(trackingToken);
  }, [trackingToken]);

  useEffect(() => {
    if (!enabled || status !== "ready") return;
    const onInteract = () => acknowledge();
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [enabled, status, acknowledge]);

  useEffect(() => {
    if (!enabled || !trackingToken || !status || !orderNumber) return;

    if (!initializedRef.current) {
      prevStatusRef.current = status;
      initializedRef.current = true;
      saveReadyAlertState(trackingToken, {
        ...loadReadyAlertState(trackingToken),
        lastStatus: status,
      });
      return;
    }

    const previousStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (!isReadyTransition(previousStatus, status)) {
      saveReadyAlertState(trackingToken, {
        ...loadReadyAlertState(trackingToken),
        lastStatus: status,
      });
      return;
    }

    if (activatingRef.current) {
      saveReadyAlertState(trackingToken, {
        ...loadReadyAlertState(trackingToken),
        lastStatus: status,
      });
      return;
    }

    const session = loadReadyAlertState(trackingToken);
    if (session.readyEventHandled || session.alert1Sent) return;

    const result = handleReadyTier1Delivery({
      trackingToken,
      orderNumber,
      language,
      status,
      source: "transition",
      previousStatus,
    });

    if (!result.delivered) {
      saveReadyAlertState(trackingToken, {
        ...loadReadyAlertState(trackingToken),
        readyEventHandled: true,
        lastStatus: status,
      });
      return;
    }

    if (result.delivery.notification || session.pushSubscriptionActive) {
      setNotificationDeliveredHint(true);
    }

    if (!session.alertsActivated) return;

    scheduleTier2IfNeeded(trackingToken, orderNumber, language);
  }, [enabled, trackingToken, status, orderNumber, language]);

  useEffect(() => {
    if (!trackingToken) return;
    return () => clearReadyAlertFollowUpTimer(trackingToken);
  }, [trackingToken]);

  useEffect(() => {
    if (!trackingToken || !status) return;
    if (status === "served" || status === "cancelled") {
      clearReadyAlertFollowUpTimer(trackingToken);
    }
  }, [trackingToken, status]);

  const isTerminal = status === "served" || status === "cancelled";
  const pushSubscribed = pushSubscriptionState === "SUBSCRIBED";
  const enrollmentSucceeded = enrollmentComplete || pushSubscribed;
  const needsActivation = enabled && !enrollmentSucceeded && !isTerminal;

  return {
    alertsActivated,
    pushSubscribed,
    enrollmentSucceeded,
    enrollmentComplete,
    pushSubscriptionState,
    pushSubscribeReason,
    activationDiagnostics,
    activationTrace: getActivationTraceSnapshot(),
    activating,
    needsActivation,
    activateAlerts,
    notificationDeliveredHint,
    acknowledgeReadyAlerts: acknowledge,
  };
};

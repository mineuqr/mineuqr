import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
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
    setAlertsActivated(session.alertsActivated);
    setPushSubscriptionState(resolveSessionPushState(session));
    if (session.alert1NotificationDelivered) {
      setNotificationDeliveredHint(true);
    }
  }, [trackingToken]);

  const activateAlerts = useCallback(async () => {
    if (!trackingToken || !slug || activatingRef.current) return;
    activatingRef.current = true;
    setActivating(true);
    setPushSubscriptionState("SUBSCRIBING");

    try {
      const result = await activateReadyAlertsFromGesture({ trackingToken, slug });
      logReadyAlertActivation(trackingToken, result);
      setPushSubscriptionState(result.pushSubscriptionState);
      setPushSubscribeReason(result.pushSubscribeReason);
      setActivationDiagnostics(result.diagnostics);

      const session = loadReadyAlertState(trackingToken);
      const permissionGranted = result.permission === "granted";
      const enrollmentSucceeded = permissionGranted;

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
  const notificationPermissionGranted =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";
  const enrollmentSucceeded =
    alertsActivated && notificationPermissionGranted && !activating;
  const needsActivation = enabled && !enrollmentSucceeded && !pushSubscribed && !isTerminal;

  return {
    alertsActivated,
    pushSubscribed,
    enrollmentSucceeded,
    pushSubscriptionState,
    pushSubscribeReason,
    activationDiagnostics,
    activating,
    needsActivation,
    activateAlerts,
    notificationDeliveredHint,
    acknowledgeReadyAlerts: acknowledge,
  };
}

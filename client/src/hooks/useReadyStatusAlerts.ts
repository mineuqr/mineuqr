import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { logReadyAlertActivation } from "@/lib/readyNotificationDiagnostics";
import {
  detectInitialPushSubscriptionState,
  isIosWebKitTabWithoutPush,
  type PushActivationDiagnostics,
  type PushSubscriptionState,
} from "@/lib/pushSubscriptionState";
import {
  acknowledgeReadyAlerts,
  activateReadyAlertsFromGesture,
  clearReadyAlertFollowUpTimer,
  deliverReadyAlertTier,
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
    if (!trackingToken || !slug || activating) return;
    setActivating(true);
    setPushSubscriptionState("SUBSCRIBING");
    try {
      const result = await activateReadyAlertsFromGesture({ trackingToken, slug });
      logReadyAlertActivation(trackingToken, result);
      setPushSubscriptionState(result.pushSubscriptionState);
      setPushSubscribeReason(result.pushSubscribeReason);
      setActivationDiagnostics(result.diagnostics);

      const session = loadReadyAlertState(trackingToken);
      saveReadyAlertState(trackingToken, {
        ...session,
        alertsActivated: result.audioReady,
        pushSubscriptionActive: result.pushSubscribed,
        pushSubscriptionState: result.pushSubscriptionState,
      });
      setAlertsActivated(result.audioReady);
    } finally {
      setActivating(false);
    }
  }, [trackingToken, slug, activating]);

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

    const session = loadReadyAlertState(trackingToken);
    if (session.alert1Sent) return;

    const delivery1 = deliverReadyAlertTier({
      trackingToken,
      tier: 1,
      orderNumber,
      language,
      alertsActivated: session.alertsActivated,
    });

    if (delivery1.notification || session.pushSubscriptionActive) {
      setNotificationDeliveredHint(true);
    }

    saveReadyAlertState(trackingToken, {
      ...session,
      alert1Sent: true,
      alert1NotificationDelivered: delivery1.notification,
      lastStatus: status,
    });

    if (!session.alertsActivated) return;

    scheduleReadyAlertFollowUp(trackingToken, () => {
      const latest = loadReadyAlertState(trackingToken);
      if (latest.acknowledged || latest.alert2Sent || !latest.alertsActivated) return;

      const delivery2 = deliverReadyAlertTier({
        trackingToken,
        tier: 2,
        orderNumber,
        language,
        alertsActivated: true,
      });

      saveReadyAlertState(trackingToken, {
        ...latest,
        alert2Sent: true,
        alert2NotificationDelivered: delivery2.notification,
        lastStatus: "ready",
      });
    });
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
  const needsActivation = enabled && !pushSubscribed && !isTerminal;
  const showIosInstallSteps = isIosWebKitTabWithoutPush();

  return {
    alertsActivated,
    pushSubscribed,
    pushSubscriptionState,
    pushSubscribeReason,
    activationDiagnostics,
    activating,
    needsActivation,
    activateAlerts,
    notificationDeliveredHint,
    showIosInstallSteps,
    acknowledgeReadyAlerts: acknowledge,
  };
}

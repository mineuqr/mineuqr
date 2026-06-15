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
  deliverMissedReadyTier1IfNeeded,
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
  const statusRef = useRef(status);
  const orderNumberRef = useRef(orderNumber);

  useEffect(() => {
    statusRef.current = status;
    orderNumberRef.current = orderNumber;
  }, [status, orderNumber]);

  useEffect(() => {
    if (!trackingToken) return;
    const session = loadReadyAlertState(trackingToken);
    setAlertsActivated(session.alertsActivated);
    setPushSubscriptionState(resolveSessionPushState(session));
    if (session.alert1NotificationDelivered) {
      setNotificationDeliveredHint(true);
    }
  }, [trackingToken]);

  const runRecoveryIfNeeded = useCallback(() => {
    const currentStatus = statusRef.current;
    const currentOrderNumber = orderNumberRef.current;
    if (!trackingToken || !currentOrderNumber || currentStatus !== "ready") return;

    const result = deliverMissedReadyTier1IfNeeded({
      trackingToken,
      orderNumber: currentOrderNumber,
      language,
      currentStatus,
    });
    if (!result?.delivered) return;

    const session = loadReadyAlertState(trackingToken);
    if (result.delivery.notification || session.pushSubscriptionActive) {
      setNotificationDeliveredHint(true);
    }
    scheduleTier2IfNeeded(trackingToken, currentOrderNumber, language);
  }, [trackingToken, language]);

  const activateAlerts = useCallback(async () => {
    if (!trackingToken || !slug || activating) return;
    setActivating(true);
    setPushSubscriptionState("SUBSCRIBING");

    // RECOVERY-1A/1B: foreground opt-in is immediate (independent of audio/push).
    const sessionBefore = loadReadyAlertState(trackingToken);
    saveReadyAlertState(trackingToken, { ...sessionBefore, alertsActivated: true });
    setAlertsActivated(true);

    try {
      const result = await activateReadyAlertsFromGesture({ trackingToken, slug });
      logReadyAlertActivation(trackingToken, result);
      setPushSubscriptionState(result.pushSubscriptionState);
      setPushSubscribeReason(result.pushSubscribeReason);
      setActivationDiagnostics(result.diagnostics);

      const session = loadReadyAlertState(trackingToken);
      saveReadyAlertState(trackingToken, {
        ...session,
        alertsActivated: true,
        pushSubscriptionActive: result.pushSubscribed,
        pushSubscriptionState: result.pushSubscriptionState,
      });
      setAlertsActivated(true);
      runRecoveryIfNeeded();
    } finally {
      setActivating(false);
    }
  }, [trackingToken, slug, activating, runRecoveryIfNeeded]);

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

    const result = handleReadyTier1Delivery({
      trackingToken,
      orderNumber,
      language,
      status,
      source: "transition",
      previousStatus,
    });

    if (!result.delivered) return;

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

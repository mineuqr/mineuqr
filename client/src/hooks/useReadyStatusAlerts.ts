import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import {
  acknowledgeReadyAlerts,
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
  status: OrderLifecycleStatus | undefined;
  orderNumber: string | undefined;
  language: "ar" | "en";
  enabled: boolean;
};

function scheduleTier2IfNeeded(
  trackingToken: string,
  orderNumber: string,
  language: "ar" | "en"
): void {
  scheduleReadyAlertFollowUp(trackingToken, () => {
    handleReadyTier2Delivery({ trackingToken, orderNumber, language });
  });
}

/**
 * CUSTOMER-NOTIFICATIONS-SIMPLIFICATION-1 — foreground READY alerts only.
 * No enrollment, permission, or push subscription on the customer journey.
 */
export function useReadyStatusAlerts({
  trackingToken,
  status,
  orderNumber,
  language,
  enabled,
}: UseReadyStatusAlertsOptions) {
  const [notificationDeliveredHint, setNotificationDeliveredHint] = useState(false);
  const prevStatusRef = useRef<OrderLifecycleStatus | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!trackingToken) return;
    const session = loadReadyAlertState(trackingToken);
    if (session.alert1NotificationDelivered) {
      setNotificationDeliveredHint(true);
    }
  }, [trackingToken]);

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

    if (!result.delivered) {
      saveReadyAlertState(trackingToken, {
        ...loadReadyAlertState(trackingToken),
        readyEventHandled: true,
        lastStatus: status,
      });
      return;
    }

    if (result.delivery.notification) {
      setNotificationDeliveredHint(true);
    }

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

  return {
    notificationDeliveredHint,
    acknowledgeReadyAlerts: acknowledge,
  };
}

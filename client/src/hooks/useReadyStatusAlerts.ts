import { useEffect, useRef, useState } from "react";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import {
  handleReadyTier1Delivery,
  isReadyTransition,
  loadReadyAlertState,
  saveReadyAlertState,
} from "@/lib/readyNotification";

type UseReadyStatusAlertsOptions = {
  trackingToken: string;
  status: OrderLifecycleStatus | undefined;
  orderNumber: string | undefined;
  language: "ar" | "en";
  enabled: boolean;
};

/**
 * CUSTOMER-NOTIFICATIONS-SIMPLIFICATION-1 — foreground tier-1 READY alerts only.
 * READY-TIER2-REMOVAL-1 — no follow-up reminder scheduling.
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
  }, [enabled, trackingToken, status, orderNumber, language]);

  return {
    notificationDeliveredHint,
  };
}

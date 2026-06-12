import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { unlockNotificationAudio } from "@/lib/notificationSound";
import {
  acknowledgeReadyAlerts,
  clearReadyAlertFollowUpTimer,
  deliverReadyAlertTier,
  isReadyTransition,
  loadReadyAlertState,
  requestReadyNotificationPermission,
  saveReadyAlertState,
  scheduleReadyAlertFollowUp,
  wasReadyAlertDelivered,
} from "@/lib/readyNotification";

type UseReadyStatusAlertsOptions = {
  trackingToken: string;
  status: OrderLifecycleStatus | undefined;
  orderNumber: string | undefined;
  language: "ar" | "en";
  enabled: boolean;
};

export function useReadyStatusAlerts({
  trackingToken,
  status,
  orderNumber,
  language,
  enabled,
}: UseReadyStatusAlertsOptions) {
  const [notificationSentHint, setNotificationSentHint] = useState(false);
  const prevStatusRef = useRef<OrderLifecycleStatus | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    void requestReadyNotificationPermission();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const unlock = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled]);

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
    });

    if (wasReadyAlertDelivered(delivery1)) {
      setNotificationSentHint(true);
    }

    saveReadyAlertState(trackingToken, {
      ...session,
      alert1Sent: true,
      lastStatus: status,
    });

    scheduleReadyAlertFollowUp(trackingToken, () => {
      const latest = loadReadyAlertState(trackingToken);
      if (latest.acknowledged || latest.alert2Sent) return;

      deliverReadyAlertTier({
        trackingToken,
        tier: 2,
        orderNumber,
        language,
      });

      saveReadyAlertState(trackingToken, {
        ...latest,
        alert2Sent: true,
        lastStatus: "ready",
      });
    });
  }, [enabled, trackingToken, status, orderNumber, language]);

  useEffect(() => {
    if (!trackingToken) return;
    return () => clearReadyAlertFollowUpTimer(trackingToken);
  }, [trackingToken]);

  useEffect(() => {
    if (!trackingToken) return;
    const session = loadReadyAlertState(trackingToken);
    if (session.alert1Sent) {
      setNotificationSentHint(true);
    }
  }, [trackingToken]);

  useEffect(() => {
    if (!trackingToken || !status) return;
    if (status === "served" || status === "cancelled") {
      clearReadyAlertFollowUpTimer(trackingToken);
    }
  }, [trackingToken, status]);

  return { notificationSentHint, acknowledgeReadyAlerts: acknowledge };
}

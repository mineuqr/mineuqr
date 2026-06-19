import { useCallback, useEffect, useRef, useState } from "react";
import {
  recoverDiningSession,
  type DiningSessionRecoveryClient,
  type RecoveredDiningSession,
} from "@/lib/diningSessionRecovery";
import {
  attachDiningSessionRevalidationListeners,
  isDiningSessionRecoveryContextReady,
  type DiningSessionRecoveryMode,
} from "@/lib/diningSessionRevalidation";

export function useDiningSessionRecovery({
  slug,
  tableNumber,
  restaurantId,
  client,
}: {
  slug: string;
  tableNumber: number;
  restaurantId?: number;
  client: DiningSessionRecoveryClient;
}) {
  const [recoveredSession, setRecoveredSession] = useState<RecoveredDiningSession | null>(
    null
  );
  const [recoveryDone, setRecoveryDone] = useState(tableNumber <= 0);
  const clientRef = useRef(client);
  clientRef.current = client;

  const runRecovery = useCallback(
    async (mode: DiningSessionRecoveryMode) => {
      if (!isDiningSessionRecoveryContextReady(slug, tableNumber, restaurantId)) {
        setRecoveredSession(null);
        setRecoveryDone(true);
        return;
      }

      if (mode === "initial") {
        setRecoveryDone(false);
      }

      try {
        const session = await recoverDiningSession({
          slug,
          tableNumber,
          client: clientRef.current,
        });
        setRecoveredSession(session);
      } catch {
        setRecoveredSession(null);
      } finally {
        setRecoveryDone(true);
      }
    },
    [slug, tableNumber, restaurantId]
  );

  const runRecoveryRef = useRef(runRecovery);
  runRecoveryRef.current = runRecovery;

  useEffect(() => {
    void runRecovery("initial");
  }, [runRecovery]);

  useEffect(() => {
    if (!isDiningSessionRecoveryContextReady(slug, tableNumber, restaurantId)) {
      return;
    }

    return attachDiningSessionRevalidationListeners(() => {
      void runRecoveryRef.current("revalidate");
    });
  }, [slug, tableNumber, restaurantId]);

  return { recoveredSession, recoveryDone, setRecoveredSession };
}

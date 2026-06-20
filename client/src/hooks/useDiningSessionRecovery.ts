import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import {
  recoverDiningSession,
  type DiningSessionRecoveryClient,
  type DiningSessionRecoveryResult,
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
  const [recovery, setRecovery] = useState<DiningSessionRecoveryResult>({
    session: null,
    sessionEnded: false,
  });
  const [visitSessionEnded, setVisitSessionEnded] = useState(false);
  const [visitEndedStatus, setVisitEndedStatus] = useState<DiningSessionStatus | undefined>();
  const [recoveryDone, setRecoveryDone] = useState(tableNumber <= 0);
  const clientRef = useRef(client);
  clientRef.current = client;

  useEffect(() => {
    setVisitSessionEnded(false);
    setVisitEndedStatus(undefined);
  }, [slug, tableNumber]);

  const runRecovery = useCallback(
    async (mode: DiningSessionRecoveryMode) => {
      if (!isDiningSessionRecoveryContextReady(slug, tableNumber, restaurantId)) {
        setRecovery({ session: null, sessionEnded: false });
        setVisitSessionEnded(false);
        setVisitEndedStatus(undefined);
        setRecoveryDone(true);
        return;
      }

      if (mode === "initial") {
        setRecoveryDone(false);
      }

      try {
        const result = await recoverDiningSession({
          slug,
          tableNumber,
          client: clientRef.current,
          mode,
        });

        if (result.session?.status === "open") {
          setVisitSessionEnded(false);
          setVisitEndedStatus(undefined);
        } else if (mode === "revalidate" && result.sessionEnded) {
          setVisitSessionEnded(true);
          if (result.endedStatus) {
            setVisitEndedStatus(result.endedStatus);
          }
        }

        setRecovery(result);
      } catch {
        setRecovery({ session: null, sessionEnded: false });
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

  const effectiveRecovery = useMemo(
    (): DiningSessionRecoveryResult => ({
      ...recovery,
      sessionEnded: recovery.sessionEnded || visitSessionEnded,
      endedStatus: recovery.endedStatus ?? visitEndedStatus,
    }),
    [recovery, visitSessionEnded, visitEndedStatus]
  );

  return { recovery: effectiveRecovery, recoveryDone, setRecovery };
}

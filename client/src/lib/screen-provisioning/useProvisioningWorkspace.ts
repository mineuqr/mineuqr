import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { provisioningSessionManager } from "./ProvisioningSessionManager";
import type { ProvisioningSession } from "./provisioningSessionContract";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { readProvisioningUrlState } from "./provisioningUrl";

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_TICK_MS = 1_000;

/**
 * Provisioning workspace hook — session authority + device polling.
 * Timers live here, not in presentation components.
 */
export function useProvisioningWorkspace(restaurantId: number, enabled: boolean) {
  const urlState = useMemo(() => readProvisioningUrlState(), []);
  const [session, setSession] = useState<ProvisioningSession | null>(null);
  const managerRef = useRef(provisioningSessionManager);

  const deviceQuery = trpc.operationalDevice.management.get.useQuery(
    { restaurantId, deviceId: session?.deviceId ?? "" },
    {
      enabled: enabled && session != null && session.deviceId.length > 0,
      refetchInterval: enabled && session?.deviceId ? POLL_INTERVAL_MS : false,
    }
  );

  const fleetPollQuery = trpc.operationalDevice.fleet.queryScreens.useQuery(
    {
      restaurantId,
      search: session?.deviceId,
      limit: 1,
    },
    {
      enabled: enabled && session != null && session.deviceId.length > 0,
      refetchInterval: enabled && session?.deviceId ? POLL_INTERVAL_MS : false,
    }
  );

  useEffect(() => {
    if (!enabled) return;
    const manager = managerRef.current;

    if (urlState.sessionId) {
      const loaded = manager.loadSession(urlState.sessionId);
      if (loaded) {
        setSession(manager.tickTimeout(loaded));
        return;
      }
    }

    if (urlState.mode === "create") {
      const draft = manager.createDraftSession(restaurantId);
      setSession(manager.tickTimeout(draft));
      return;
    }
  }, [enabled, restaurantId, urlState.sessionId, urlState.mode]);

  useEffect(() => {
    if (!session?.deviceId) return;
    const fleetItem: FleetScreenReadModel | null =
      fleetPollQuery.data?.items.find((i) => i.screenId === session.deviceId) ?? null;
    const updated = managerRef.current.updateFromFleet(session, fleetItem);
    setSession(updated);
  }, [fleetPollQuery.data, session?.deviceId]);

  useEffect(() => {
    if (!session || session.status === "operational" || session.status === "cancelled") return;
    const id = window.setInterval(() => {
      setSession((current) => {
        if (!current) return current;
        return managerRef.current.tickTimeout(current);
      });
    }, TIMEOUT_TICK_MS);
    return () => window.clearInterval(id);
  }, [session?.sessionId, session?.status]);

  const health = useMemo(
    () => (session ? managerRef.current.getHealth(session) : null),
    [session]
  );

  const diagnostics = useMemo(
    () => (session ? managerRef.current.getDiagnostics(session) : null),
    [session]
  );

  const setSessionState = useCallback((next: ProvisioningSession) => {
    setSession(next);
  }, []);

  return {
    session,
    setSessionState,
    health,
    diagnostics,
    device: deviceQuery.data ?? null,
    isPolling: fleetPollQuery.isFetching,
    retry: () => {
      if (!session) return;
      setSession(managerRef.current.retry(session));
    },
    cancel: () => {
      if (!session) return;
      managerRef.current.cancel(session.sessionId);
      setSession(null);
    },
  };
}

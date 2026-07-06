import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { provisioningSessionManager } from "./ProvisioningSessionManager";
import type { ProvisioningHealth, ProvisioningSession } from "./provisioningSessionContract";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { projectFleetDeviceStatus } from "./projectFleetDeviceStatus";
import { readProvisioningUrlState } from "./provisioningUrl";
import type { OperationalDeviceListItem } from "../../../../server/operational-device/domain/deviceContracts";

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_TICK_MS = 1_000;

export type DeviceStatusView = {
  deviceId: string;
  displayName: string;
  fleetScreen: FleetScreenReadModel;
  device: OperationalDeviceListItem | null;
  health: ProvisioningHealth;
};

/**
 * Provisioning workspace hook — session authority + device polling.
 * Timers live here, not in presentation components.
 */
export function useProvisioningWorkspace(restaurantId: number, enabled: boolean) {
  const urlState = useMemo(() => readProvisioningUrlState(), []);
  const [session, setSession] = useState<ProvisioningSession | null>(null);
  const [sessionLoadAttempted, setSessionLoadAttempted] = useState(false);
  const managerRef = useRef(provisioningSessionManager);

  const statusDeviceId =
    urlState.mode === "status" && urlState.deviceId ? urlState.deviceId : null;

  const deviceQuery = trpc.operationalDevice.management.get.useQuery(
    { restaurantId, deviceId: session?.deviceId ?? statusDeviceId ?? "" },
    {
      enabled:
        enabled &&
        ((session != null && session.deviceId.length > 0) || statusDeviceId != null),
      refetchInterval:
        enabled && (session?.deviceId || statusDeviceId) ? POLL_INTERVAL_MS : false,
    }
  );

  const fleetPollQuery = trpc.operationalDevice.fleet.queryScreens.useQuery(
    {
      restaurantId,
      search: session?.deviceId ?? statusDeviceId ?? undefined,
      limit: 1,
    },
    {
      enabled:
        enabled &&
        ((session != null && session.deviceId.length > 0) || statusDeviceId != null),
      refetchInterval:
        enabled && (session?.deviceId || statusDeviceId) ? POLL_INTERVAL_MS : false,
    }
  );

  useEffect(() => {
    if (!enabled) return;
    const manager = managerRef.current;

    if (urlState.sessionId) {
      const loaded = manager.loadSession(urlState.sessionId);
      setSessionLoadAttempted(true);
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

    if (urlState.mode === "resume" && urlState.sessionId) {
      setSessionLoadAttempted(true);
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

  const statusView = useMemo<DeviceStatusView | null>(() => {
    if (!statusDeviceId) return null;
    const fleetScreen =
      fleetPollQuery.data?.items.find((item) => item.screenId === statusDeviceId) ?? null;
    if (!fleetScreen) return null;
    return {
      deviceId: statusDeviceId,
      displayName: fleetScreen.displayName,
      fleetScreen,
      device: deviceQuery.data ?? null,
      health: projectFleetDeviceStatus(fleetScreen),
    };
  }, [statusDeviceId, fleetPollQuery.data, deviceQuery.data]);

  const resumeSessionMissing = useMemo(() => {
    if (urlState.mode !== "resume") return false;
    if (session != null) return false;
    if (urlState.sessionId) return sessionLoadAttempted;
    return urlState.deviceId != null;
  }, [urlState.mode, urlState.sessionId, urlState.deviceId, session, sessionLoadAttempted]);

  const setSessionState = useCallback((next: ProvisioningSession) => {
    setSession(next);
  }, []);

  return {
    session,
    setSessionState,
    health,
    diagnostics,
    device: deviceQuery.data ?? null,
    statusView,
    resumeSessionMissing,
    isStatusLoading:
      statusDeviceId != null &&
      (fleetPollQuery.isLoading || deviceQuery.isLoading) &&
      statusView == null,
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import {
  clearOperationalScreenCredentials,
  type OperationalScreenCredentials,
} from "./credentialStore";
import {
  createBootstrapId,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_RETRY_MAX_MS,
  HEARTBEAT_RETRY_MIN_MS,
  isDeviceAuthError,
  STATUS_POLL_INTERVAL_MS,
} from "./bootstrapLogic";
import { runtimeContextFactory } from "./RuntimeContextFactory";
import { RuntimeContextValidationError } from "./runtimeInstanceContext";
import type { RuntimeContextStore } from "./runtimeContextStore";
import { RuntimeConfigurationManager } from "./configuration/runtimeConfigurationManager";
import type { ConfigurationHealth } from "./configuration/runtimeConfigurationContract";
import { RuntimeCategoryFilterManager } from "./category-filter/runtimeCategoryFilterManager";
import type {
  CategoryFilterHealth,
  RuntimeCategoryFilter,
} from "./category-filter/runtimeCategoryFilterContract";
import type { CategoryFilterPredicate } from "./category-filter/runtimeCategoryFilterManager";
import { RuntimeDisplayDensityManager } from "./density/runtimeDisplayDensityManager";
import type {
  DisplayDensityHealth,
  RuntimeDisplayDensity,
} from "./density/runtimeDisplayDensityContract";
import { projectHealthFromScreenState } from "./state/projectScreenHealth";
import { projectDiagnosticsFromScreenState } from "./state/projectScreenDiagnostics";
import {
  OperationalScreenStateAggregator,
  type StateAggregatorInput,
} from "./state/operationalScreenStateAggregator";
import type { OperationalScreenState } from "./state/operationalScreenStateContract";
import { getRoleCapabilities } from "./runtimeCapabilities";
import { mergeCapabilityIntoHealth } from "./capability/projectCapabilityHealth";
import { projectCapabilityDiagnostics } from "./capability/projectCapabilityDiagnostics";
import {
  runtimeCapabilityNegotiator,
} from "./capability/runtimeCapabilityNegotiator";
import { buildCapabilityNegotiationInput } from "./capability/negotiateRuntimeCapabilities";
import {
  INITIAL_PHASE,
  transition,
  type BootstrapEvent,
} from "./bootstrapStateMachine";
import { collectRuntimeFingerprint } from "./runtimeFingerprint";
import { isBlockedRole } from "./runtimeCapabilities";
import "./roles/registerRoles";
import { resolveRuntimeRole } from "./roles/runtimeRoleRegistry";
import { buildLifecycleContext } from "./roles/runtimeRoleLifecycle";
import type { RoleRuntimeHealth } from "./roles/runtimeRoleContract";
import { screenTrpc } from "./screenTrpc";
import type { BootstrapPhase, OperationalScreenRuntimeContext } from "./runtimeTypes";
import { spaNavigate } from "@/const";

export type RuntimeDiagnostics = {
  phase: BootstrapPhase;
  bootstrapId: string;
  heartbeatFailures: number;
  statusQueryState: string;
  lastError: string | null;
};

export type RolePlatformMetrics = {
  heartbeatCount: number;
  reconnectCount: number;
  reconnecting: boolean;
};

export type RuntimeOrchestratorCoreValue = {
  phase: BootstrapPhase;
  context: OperationalScreenRuntimeContext | null;
  degraded: boolean;
  lastError: string | null;
  diagnostics: RuntimeDiagnostics;
  rolePlatform: RolePlatformMetrics;
  roleHealth: RoleRuntimeHealth | null;
  roleDiagnostics: Record<string, unknown> | null;
  configurationHealth: ConfigurationHealth | null;
  categoryFilter: RuntimeCategoryFilter | null;
  categoryFilterHealth: CategoryFilterHealth | null;
  categoryFilterPredicate: CategoryFilterPredicate;
  displayDensity: RuntimeDisplayDensity | null;
  displayDensityHealth: DisplayDensityHealth | null;
  screenState: OperationalScreenState | null;
  runtimeCapabilities: import("./capability/runtimeCapabilityContract").RuntimeCapabilityContract | null;
  refresh: () => Promise<void>;
  reloadConfiguration: () => Promise<void>;
  /** Alias for reloadConfiguration — reapplies configuration and density. */
  reload: () => Promise<void>;
  reloadDensity: () => Promise<void>;
  unpair: () => void;
  retry: () => Promise<void>;
};

function nextHeartbeatDelay(failures: number): number {
  const delay = HEARTBEAT_RETRY_MIN_MS * 2 ** failures;
  return Math.min(delay, HEARTBEAT_RETRY_MAX_MS);
}

function withStoreInstance(
  runtimeContext: OperationalScreenRuntimeContext,
  store: RuntimeContextStore
): OperationalScreenRuntimeContext {
  const snapshot = store.getCurrentSnapshot();
  return snapshot ? { ...runtimeContext, instance: snapshot } : runtimeContext;
}

/**
 * Canonical runtime orchestrator. Owns the single lifecycle `phase` (driven only
 * by the approved state machine) and the single `context` snapshot. There is no
 * parallel lifecycle state: `context.bootstrap.phase` is always derived from the
 * authoritative `phase` before the context is exposed.
 */
export function useRuntimeOrchestrator(
  credentials: OperationalScreenCredentials,
  store: RuntimeContextStore
): RuntimeOrchestratorCoreValue {
  const [bootstrapId] = useState(createBootstrapId);
  const [phase, setPhase] = useState<BootstrapPhase>(INITIAL_PHASE);
  const [context, setContext] = useState<OperationalScreenRuntimeContext | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const phaseRef = useRef<BootstrapPhase>(INITIAL_PHASE);
  const heartbeatFailures = useRef(0);
  const heartbeatCount = useRef(0);
  const reconnectCount = useRef(0);
  const wasDegradedRef = useRef(false);
  const [reconnecting, setReconnecting] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatStopped = useRef(false);
  const configManagerRef = useRef(new RuntimeConfigurationManager());
  const categoryFilterManagerRef = useRef(new RuntimeCategoryFilterManager());
  const densityManagerRef = useRef(new RuntimeDisplayDensityManager());
  const stateAggregatorRef = useRef(new OperationalScreenStateAggregator());
  const [categoryFilterVersion, setCategoryFilterVersion] = useState(0);
  const [densityVersion, setDensityVersion] = useState(0);

  const syncCategoryFilter = useCallback((runtimeConfiguration: NonNullable<ReturnType<RuntimeConfigurationManager["getConfiguration"]>>) => {
    const capabilities = getRoleCapabilities(runtimeConfiguration.role);
    categoryFilterManagerRef.current.syncFromConfiguration(runtimeConfiguration, capabilities);
    setCategoryFilterVersion((v) => v + 1);
  }, []);

  const syncDisplayDensity = useCallback((runtimeConfiguration: NonNullable<ReturnType<RuntimeConfigurationManager["getConfiguration"]>>) => {
    const capabilities = getRoleCapabilities(runtimeConfiguration.role);
    densityManagerRef.current.syncFromConfiguration(runtimeConfiguration, capabilities);
    setDensityVersion((v) => v + 1);
  }, []);

  const degraded = phase === "degraded";

  /** Single choke point for lifecycle changes — enforces the state machine. */
  const dispatch = useCallback((event: BootstrapEvent): BootstrapPhase => {
    const current = phaseRef.current;
    const next = transition(current, event);
    if (next !== current) {
      phaseRef.current = next;
      setPhase(next);
    }
    return next;
  }, []);

  const statusQuery = screenTrpc.operationalDevice.runtime.getStatus.useQuery(undefined, {
    enabled: phase !== "pairing_redirect" && phase !== "revoked",
    retry: (failureCount, error) => {
      if (isDeviceAuthError(error)) return false;
      return failureCount < 5;
    },
    refetchInterval:
      phase === "running" || phase === "blocked" || phase === "degraded"
        ? STATUS_POLL_INTERVAL_MS
        : false,
    refetchOnWindowFocus: true,
  });

  const heartbeatMutation = screenTrpc.operationalDevice.runtime.heartbeat.useMutation();

  const stopHeartbeat = useCallback(() => {
    heartbeatStopped.current = true;
    if (heartbeatTimer.current) {
      clearTimeout(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const handleRevoked = useCallback(() => {
    stopHeartbeat();
    clearOperationalScreenCredentials();
    setContext(null);
    store.replaceSnapshot(null, "repairing");
    dispatch({ type: "AUTH_REVOKED" });
    dispatch({ type: "PAIRING_REDIRECTED" });
    spaNavigate("/screen/pair", { replace: true });
  }, [dispatch, stopHeartbeat]);

  const scheduleHeartbeat = useCallback(
    (delayMs: number) => {
      if (heartbeatStopped.current) return;
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
      heartbeatTimer.current = setTimeout(() => {
        void heartbeatMutation
          .mutateAsync({ reportedVersion: import.meta.env.VITE_APP_VERSION ?? "web" })
          .then(() => {
            heartbeatFailures.current = 0;
            heartbeatCount.current += 1;
            setLastError(null);
            dispatch({ type: "NETWORK_RECOVERED" });
            setContext((prev) => {
              if (!prev) return prev;
              const current = store.getCurrentSnapshot() ?? prev.instance;
              const withHeartbeat = runtimeContextFactory.withHeartbeat(
                current,
                new Date().toISOString()
              );
              store.replaceSnapshot(withHeartbeat, "heartbeat_refresh");
              return withStoreInstance({ ...prev }, store);
            });
            scheduleHeartbeat(HEARTBEAT_INTERVAL_MS);
          })
          .catch((error: unknown) => {
            if (isDeviceAuthError(error)) {
              handleRevoked();
              return;
            }
            heartbeatFailures.current += 1;
            setLastError(error instanceof Error ? error.message : "heartbeat_failed");
            dispatch({ type: "NETWORK_FAILURE" });
            scheduleHeartbeat(nextHeartbeatDelay(heartbeatFailures.current));
          });
      }, delayMs);
    },
    [dispatch, handleRevoked, heartbeatMutation]
  );

  // Loading → Validating | PairingRedirect (credentials are guaranteed present here).
  useEffect(() => {
    dispatch({ type: "CREDENTIALS_FOUND" });
  }, [dispatch]);

  // Validating/Degraded → ContextReady → HeartbeatActive → Running | Blocked
  useEffect(() => {
    if (!statusQuery.data) return;

    if (statusQuery.error && isDeviceAuthError(statusQuery.error)) {
      handleRevoked();
      return;
    }

    const status = statusQuery.data;

    // Terminal revoked conditions (disabled device / no active token).
    if (status.device.status === "disabled" || !status.health.hasActiveToken) {
      handleRevoked();
      return;
    }

    if (!context) {
      dispatch({ type: "STATUS_RECEIVED" }); // → context_ready
      const fingerprint = collectRuntimeFingerprint(bootstrapId);
      const assembledPhase = dispatch({ type: "CONTEXT_ASSEMBLED" }); // → heartbeat_active
      try {
        const instance = runtimeContextFactory.resolve({
          credentials,
          status,
          bootstrapId,
        });
        const runtimeConfiguration = runtimeContextFactory.loadConfiguration(
          status,
          configManagerRef.current
        );
        const snapshot = configManagerRef.current.getSnapshot();
        const nextContext = runtimeContextFactory.buildRuntimeContext({
          instance,
          bootstrapId,
          phase: assembledPhase,
          runtimeHealth: status.health,
          fingerprint,
          runtimeConfiguration,
          lastAppliedVersion: snapshot.lastAppliedVersion,
        });
        store.replaceSnapshot(instance, "bootstrap");
        setContext(withStoreInstance(nextContext, store));
      } catch (error) {
        if (error instanceof RuntimeContextValidationError) {
          handleRevoked();
          return;
        }
        throw error;
      }
      heartbeatStopped.current = false;
      scheduleHeartbeat(0);
      const runningPhase = dispatch({ type: "HEARTBEAT_STARTED" }); // → running
      if (isBlockedRole(status.device.role)) {
        dispatch({ type: "RUN_BLOCKED" }); // running → blocked
      } else {
        void runningPhase;
      }
      return;
    }

    // Already running: reconcile reloadable/dynamic fields only. No lifecycle jump.
    if (configManagerRef.current.detectVersionChange(status.configVersion)) {
      setContext((prev) => {
        if (!prev) return prev;
        const reloaded = runtimeContextFactory.applyConfigurationReload(
          prev,
          status,
          credentials,
          configManagerRef.current
        );
        store.replaceSnapshot(reloaded.instance, "configuration_reload");
        return withStoreInstance(reloaded, store);
      });
    } else {
      setContext((prev) => {
        if (!prev) return prev;
        const currentInstance = store.getCurrentSnapshot() ?? prev.instance;
        const refreshed = runtimeContextFactory.refresh(
          { credentials, status, bootstrapId: prev.bootstrap.bootstrapId },
          currentInstance
        );
        store.replaceSnapshot(refreshed, "manual_refresh");
        return withStoreInstance(
          {
            ...prev,
            runtimeStatus: status.health,
            identity: { ...prev.identity, displayName: refreshed.identity.displayIdentity },
          },
          store
        );
      });
    }

    // Recover from degraded when a fresh status arrives.
    if (wasDegradedRef.current && phaseRef.current !== "degraded") {
      reconnectCount.current += 1;
      setReconnecting(true);
      wasDegradedRef.current = false;
    }
    dispatch({ type: "NETWORK_RECOVERED" });
    if (isBlockedRole(status.device.role)) {
      dispatch({ type: "RUN_BLOCKED" });
    }
  }, [
    bootstrapId,
    context,
    credentials,
    dispatch,
    handleRevoked,
    scheduleHeartbeat,
    statusQuery.data,
    statusQuery.error,
    retryToken,
    store,
  ]);

  // Non-auth status errors → Degraded.
  useEffect(() => {
    if (!statusQuery.error || isDeviceAuthError(statusQuery.error)) return;
    wasDegradedRef.current = true;
    setReconnecting(false);
    setLastError(
      statusQuery.error instanceof TRPCClientError
        ? statusQuery.error.message
        : "status_unavailable"
    );
    dispatch({ type: "NETWORK_FAILURE" });
  }, [dispatch, statusQuery.error]);

  useEffect(() => () => stopHeartbeat(), [stopHeartbeat]);

  useEffect(() => {
    if (!context?.runtimeConfiguration) return;
    syncCategoryFilter(context.runtimeConfiguration);
    syncDisplayDensity(context.runtimeConfiguration);
  }, [context?.runtimeConfiguration.version, context?.runtimeConfiguration, syncCategoryFilter, syncDisplayDensity]);

  const unpair = useCallback(() => {
    stopHeartbeat();
    configManagerRef.current.dispose();
    categoryFilterManagerRef.current.dispose();
    densityManagerRef.current.dispose();
    stateAggregatorRef.current.dispose();
    clearOperationalScreenCredentials();
    setContext(null);
    store.replaceSnapshot(null, "repairing");
    dispatch({ type: "AUTH_REVOKED" });
    dispatch({ type: "PAIRING_REDIRECTED" });
    spaNavigate("/screen/pair", { replace: true });
  }, [dispatch, stopHeartbeat]);

  // The exposed context always carries the authoritative phase (no duplicate state).
  const exposedContext = useMemo<OperationalScreenRuntimeContext | null>(() => {
    if (!context) return null;
    const densitySnapshot = densityManagerRef.current.getSnapshot();
    const withPhase =
      context.bootstrap.phase === phase
        ? context
        : { ...context, bootstrap: { ...context.bootstrap, phase } };
    return {
      ...withPhase,
      displayDensity: densitySnapshot.density?.density ?? withPhase.displayDensity,
      densityState: densitySnapshot.density?.state ?? withPhase.densityState,
      densityVersion: densitySnapshot.density?.version ?? withPhase.densityVersion,
      resolvedDensityModel: densitySnapshot.model,
    };
  }, [context, phase, densityVersion]);

  const rolePlatform = useMemo<RolePlatformMetrics>(
    () => ({
      heartbeatCount: heartbeatCount.current,
      reconnectCount: reconnectCount.current,
      reconnecting,
    }),
    [phase, reconnecting, statusQuery.status, lastError]
  );

  const configurationHealth = useMemo<ConfigurationHealth | null>(() => {
    const incoming = statusQuery.data?.configVersion;
    return configManagerRef.current.buildHealth(incoming);
  }, [context, statusQuery.data?.configVersion]);

  const categoryFilterSnapshot = useMemo(() => {
    void categoryFilterVersion;
    return categoryFilterManagerRef.current.getSnapshot();
  }, [categoryFilterVersion, context?.configurationVersion]);

  const categoryFilter = categoryFilterSnapshot.filter;
  const categoryFilterPredicate = categoryFilterSnapshot.predicate;

  const categoryFilterHealth = useMemo<CategoryFilterHealth | null>(() => {
    void categoryFilterVersion;
    return categoryFilterManagerRef.current.buildHealth();
  }, [categoryFilterVersion, context?.configurationVersion]);

  const displayDensitySnapshot = useMemo(() => {
    void densityVersion;
    return densityManagerRef.current.getSnapshot();
  }, [densityVersion, context?.configurationVersion]);

  const displayDensity = displayDensitySnapshot.density;
  const displayDensityHealth = useMemo<DisplayDensityHealth | null>(() => {
    void densityVersion;
    const incoming = statusQuery.data?.configVersion;
    return densityManagerRef.current.buildHealth(incoming);
  }, [densityVersion, context?.configurationVersion, statusQuery.data?.configVersion]);

  const screenState = useMemo<OperationalScreenState | null>(() => {
    if (!exposedContext) return null;
    const definition = resolveRuntimeRole(exposedContext.identity.role);
    const roleRuntimeState = definition.resolveRuntimeStatus(
      phase,
      exposedContext,
      reconnecting
    );
    const input: StateAggregatorInput = {
      bootstrapPhase: phase,
      roleRuntimeState,
      roleOperational: definition.metadata.operational,
      roleBlockedReason: definition.metadata.blockedReason ?? null,
      runtimeConfiguration: exposedContext.runtimeConfiguration,
      configurationHealth,
      densityState: exposedContext.densityState,
      displayDensity: exposedContext.displayDensity,
      displayDensityHealth,
      categoryFilterHealth,
      reconnecting,
      degraded,
      lastError,
      deviceStatus: exposedContext.runtimeStatus.status,
      hasActiveToken: exposedContext.runtimeStatus.hasActiveToken,
    };
    return stateAggregatorRef.current.aggregate(input);
  }, [
    exposedContext,
    phase,
    reconnecting,
    degraded,
    lastError,
    configurationHealth,
    categoryFilterHealth,
    displayDensityHealth,
    categoryFilterVersion,
    densityVersion,
  ]);

  const contextWithScreenState = useMemo<OperationalScreenRuntimeContext | null>(() => {
    if (!exposedContext || !screenState) return null;

    const runtimeCapabilities = runtimeCapabilityNegotiator.negotiate(
      buildCapabilityNegotiationInput(exposedContext.identity.role, exposedContext.capabilities.server, {
        configurationActivated:
          exposedContext.runtimeConfiguration.configurationState === "applied" ||
          exposedContext.runtimeConfiguration.configurationState === "valid",
        densityActivated: exposedContext.runtimeConfiguration.tracked.densityActivated,
        categoriesActivated: exposedContext.runtimeConfiguration.tracked.categoriesActivated,
        operationalBlocked:
          screenState.operationalState === "blocked" ||
          screenState.businessReadiness === "role_unavailable",
        deviceDisabled: screenState.maintenanceState === "maintenance",
      })
    );

    return {
      ...exposedContext,
      screenState,
      operationalState: screenState.operationalState,
      connectivityState: screenState.connectivityState,
      businessReadiness: screenState.businessReadiness,
      maintenanceState: screenState.maintenanceState,
      warnings: screenState.warnings,
      errors: screenState.errors,
      runtimeCapabilities,
      capabilityNegotiator: runtimeCapabilityNegotiator,
      resolveCapability: (capabilityId) =>
        runtimeCapabilityNegotiator.resolve(capabilityId, runtimeCapabilities),
    };
  }, [exposedContext, screenState]);

  const roleHealth = useMemo<RoleRuntimeHealth | null>(() => {
    if (!contextWithScreenState || !screenState) return null;
    const definition = resolveRuntimeRole(contextWithScreenState.identity.role);
    const base = projectHealthFromScreenState(
      screenState,
      contextWithScreenState.identity.role,
      definition.metadata.capabilities,
      {
        heartbeatCount: rolePlatform.heartbeatCount,
        reconnectCount: rolePlatform.reconnectCount,
        appVersion: import.meta.env.VITE_APP_VERSION ?? "web",
        configurationVersion: contextWithScreenState.configurationVersion,
        appliedVersion: contextWithScreenState.lastAppliedVersion,
      }
    );
    return mergeCapabilityIntoHealth(base, contextWithScreenState.runtimeCapabilities);
  }, [contextWithScreenState, screenState, rolePlatform]);

  const roleDiagnostics = useMemo<Record<string, unknown> | null>(() => {
    if (!contextWithScreenState || !screenState) return null;
    const definition = resolveRuntimeRole(contextWithScreenState.identity.role);
    const ctx = buildLifecycleContext(definition, {
      context: contextWithScreenState,
      bootstrapPhase: phase,
      heartbeatCount: rolePlatform.heartbeatCount,
      reconnectCount: rolePlatform.reconnectCount,
      reconnecting: rolePlatform.reconnecting,
    });
    return projectDiagnosticsFromScreenState(screenState, contextWithScreenState, {
      role: definition.metadata.role,
      roleDiagnostics: definition.collectDiagnostics(ctx),
      capabilityDiagnostics: projectCapabilityDiagnostics(
        contextWithScreenState.runtimeCapabilities,
        runtimeCapabilityNegotiator.getTimeline()
      ),
    });
  }, [contextWithScreenState, screenState, phase, rolePlatform]);

  const diagnostics = useMemo<RuntimeDiagnostics>(
    () => ({
      phase,
      bootstrapId,
      heartbeatFailures: heartbeatFailures.current,
      statusQueryState: statusQuery.status,
      lastError,
    }),
    [phase, bootstrapId, statusQuery.status, lastError]
  );

  useEffect(() => {
    if (phase === "running" || phase === "blocked") {
      setReconnecting(false);
    }
  }, [phase]);

  const refetchRuntimeStatus = useCallback(async () => {
    await statusQuery.refetch();
  }, [statusQuery]);

  const refresh = refetchRuntimeStatus;
  const reloadConfiguration = refetchRuntimeStatus;
  const reloadDensity = reloadConfiguration;

  const retry = useCallback(async () => {
    setRetryToken((value) => value + 1);
    await statusQuery.refetch();
  }, [statusQuery]);

  return {
    phase,
    context: contextWithScreenState,
    degraded,
    lastError,
    diagnostics,
    rolePlatform,
    roleHealth,
    roleDiagnostics,
    configurationHealth,
    categoryFilter,
    categoryFilterHealth,
    categoryFilterPredicate,
    displayDensity,
    displayDensityHealth,
    screenState,
    runtimeCapabilities: contextWithScreenState?.runtimeCapabilities ?? null,
    refresh,
    reloadConfiguration,
    reload: reloadConfiguration,
    reloadDensity,
    unpair,
    retry,
  };
}

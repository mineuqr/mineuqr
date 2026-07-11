import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { OperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import type { OperationalScreenRuntimeContext } from "@/lib/operational-screen/runtimeTypes";
import type { FrozenRuntimeInstanceContext } from "@/lib/operational-screen/runtimeInstanceContext";
import {
  createRuntimeContextStore,
  getRuntimeContextStoreServerSnapshot,
  getRuntimeContextStoreSnapshot,
  subscribeRuntimeContextStore,
  type RuntimeContextStore,
} from "@/lib/operational-screen/runtimeContextStore";
import {
  selectRuntimeBusiness,
  selectRuntimeCapabilities,
  selectRuntimeConfiguration,
  selectRuntimeDevice,
  selectRuntimeIdentity,
  selectRuntimeMetadata,
  selectRuntimeRole,
  selectRuntimeSession,
} from "@/lib/operational-screen/runtimeContextSelectors";
import {
  createRuntimeActions,
  type RuntimeActions,
} from "@/lib/operational-screen/runtimeContextActions";
import {
  useRuntimeOrchestrator,
  type RuntimeOrchestratorCoreValue,
} from "@/lib/operational-screen/useRuntimeOrchestrator";

/**
 * RUNTIME-BOOTSTRAP-CONTRACT-1 — canonical runtime authority.
 * RUNTIME-CONTEXT-CONSOLIDATION-1 — one instance-scoped store, one snapshot subscription.
 * RUNTIME-PUBLIC-API-CONSOLIDATION-1 — Runtime Public API provider boundary.
 *
 * Export tiers:
 * - Public Runtime API: useRuntimeIdentity … useRuntimeMetadata, useRuntimeInstanceContext, useRuntimeActions
 * - Transitional Compatibility API: useScreenRuntime, useRuntimeContext, OperationalScreenRuntimeProvider
 * - Internal Runtime API: useRuntimeContextStore (tests/diagnostics only)
 */
const RuntimeOrchestratorContext = createContext<RuntimeOrchestratorCoreValue | null>(null);
const RuntimeContextStoreContext = createContext<RuntimeContextStore | null>(null);
const RuntimeInstanceSnapshotContext = createContext<FrozenRuntimeInstanceContext | null>(null);

function RuntimeInstanceSnapshotProvider({
  store,
  children,
}: {
  store: RuntimeContextStore;
  children: ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => subscribeRuntimeContextStore(store, onStoreChange),
    () => getRuntimeContextStoreSnapshot(store),
    getRuntimeContextStoreServerSnapshot
  );

  return (
    <RuntimeInstanceSnapshotContext.Provider value={snapshot}>
      {children}
    </RuntimeInstanceSnapshotContext.Provider>
  );
}

/** @classification Transitional Compatibility API — root provider; required at boot. */
export function OperationalScreenRuntimeProvider({
  credentials,
  children,
}: {
  credentials: OperationalScreenCredentials;
  children: ReactNode;
}) {
  const store = useMemo(() => createRuntimeContextStore(), []);
  const orchestrator = useRuntimeOrchestrator(credentials, store);

  return (
    <RuntimeContextStoreContext.Provider value={store}>
      <RuntimeInstanceSnapshotProvider store={store}>
        <RuntimeOrchestratorContext.Provider value={orchestrator}>
          {children}
        </RuntimeOrchestratorContext.Provider>
      </RuntimeInstanceSnapshotProvider>
    </RuntimeContextStoreContext.Provider>
  );
}

export type RuntimeOrchestratorValue = RuntimeOrchestratorCoreValue & {
  /** @deprecated Use useRuntimeInstanceContext() — compatibility wrapper only. */
  instanceContext: FrozenRuntimeInstanceContext | null;
};

/**
 * @classification Transitional Compatibility API — advanced orchestrator access.
 *
 * Intended for lifecycle coordination, diagnostics, and internal runtime subsystems.
 * - Lifecycle: phase, context, degraded, lastError
 * - Diagnostics: diagnostics, roleHealth, roleDiagnostics, rolePlatform, *Health, screenState
 * - Internal coordination: categoryFilter, categoryFilterPredicate, displayDensity
 *
 * Execution (refresh, reloadConfiguration, unpair, retry) is duplicated here for
 * orchestrator wiring only. Application code must use useRuntimeActions() instead.
 */
export function useScreenRuntime(): RuntimeOrchestratorValue {
  const orchestrator = useContext(RuntimeOrchestratorContext);
  const instanceContext = useContext(RuntimeInstanceSnapshotContext);
  if (!orchestrator) {
    throw new Error("useScreenRuntime must be used within OperationalScreenRuntimeProvider");
  }
  return { ...orchestrator, instanceContext };
}

/** @classification Public Runtime API — advanced read (full RuntimeInstanceContext snapshot). */
export function useRuntimeInstanceContext(): FrozenRuntimeInstanceContext {
  const snapshot = useContext(RuntimeInstanceSnapshotContext);
  if (!snapshot) {
    throw new Error("Runtime instance context is not ready");
  }
  return snapshot;
}

/** @classification Public Runtime API — read (identity slice). */
export function useRuntimeIdentity() {
  return selectRuntimeIdentity(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (business slice). */
export function useRuntimeBusiness() {
  return selectRuntimeBusiness(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (device slice). */
export function useRuntimeDevice() {
  return selectRuntimeDevice(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (role slice). */
export function useRuntimeRole() {
  return selectRuntimeRole(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (configuration slice). */
export function useRuntimeConfiguration() {
  return selectRuntimeConfiguration(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (capabilities slice). */
export function useRuntimeCapabilities() {
  return selectRuntimeCapabilities(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (session slice). */
export function useRuntimeSession() {
  return selectRuntimeSession(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — read (metadata slice). */
export function useRuntimeMetadata() {
  return selectRuntimeMetadata(useRuntimeInstanceContext());
}

/** @classification Public Runtime API — execute (sole public mutation surface). */
export function useRuntimeActions(): RuntimeActions {
  const { refresh, reloadConfiguration, unpair, retry } = useScreenRuntime();
  return useMemo(
    () => createRuntimeActions({ refresh, reloadConfiguration, unpair, retry }),
    [refresh, reloadConfiguration, unpair, retry]
  );
}

/**
 * @classification Transitional Compatibility API — assembled OperationalScreenRuntimeContext.
 * Prefer slice selectors (useRuntimeIdentity … useRuntimeMetadata) for new code.
 */
export function useRuntimeContext(): OperationalScreenRuntimeContext {
  const { context } = useScreenRuntime();
  const instance = useRuntimeInstanceContext();
  if (!context) {
    throw new Error("Runtime context is not ready");
  }
  return context.instance === instance ? context : { ...context, instance };
}

/** @classification Internal Runtime API — test and diagnostics store access only. */
export function useRuntimeContextStore(): RuntimeContextStore {
  const store = useContext(RuntimeContextStoreContext);
  if (!store) {
    throw new Error("useRuntimeContextStore must be used within OperationalScreenRuntimeProvider");
  }
  return store;
}

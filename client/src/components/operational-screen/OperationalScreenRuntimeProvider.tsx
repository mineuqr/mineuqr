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
  useRuntimeOrchestrator,
  type RuntimeOrchestratorCoreValue,
} from "@/lib/operational-screen/useRuntimeOrchestrator";

/**
 * RUNTIME-BOOTSTRAP-CONTRACT-1 — canonical runtime authority.
 * RUNTIME-CONTEXT-CONSOLIDATION-1 — one instance-scoped store, one snapshot subscription.
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

/** Access the full runtime authority (phase, context, lifecycle actions, diagnostics). */
export function useScreenRuntime(): RuntimeOrchestratorValue {
  const orchestrator = useContext(RuntimeOrchestratorContext);
  const instanceContext = useContext(RuntimeInstanceSnapshotContext);
  if (!orchestrator) {
    throw new Error("useScreenRuntime must be used within OperationalScreenRuntimeProvider");
  }
  return { ...orchestrator, instanceContext };
}

/** Canonical read path for RuntimeInstanceContext. */
export function useRuntimeInstanceContext(): FrozenRuntimeInstanceContext {
  const snapshot = useContext(RuntimeInstanceSnapshotContext);
  if (!snapshot) {
    throw new Error("Runtime instance context is not ready");
  }
  return snapshot;
}

/** Access the assembled runtime context with store-owned instance snapshot. */
export function useRuntimeContext(): OperationalScreenRuntimeContext {
  const { context } = useScreenRuntime();
  const instance = useRuntimeInstanceContext();
  if (!context) {
    throw new Error("Runtime context is not ready");
  }
  return context.instance === instance ? context : { ...context, instance };
}

/** @internal Test and diagnostics access to the scoped store. */
export function useRuntimeContextStore(): RuntimeContextStore {
  const store = useContext(RuntimeContextStoreContext);
  if (!store) {
    throw new Error("useRuntimeContextStore must be used within OperationalScreenRuntimeProvider");
  }
  return store;
}

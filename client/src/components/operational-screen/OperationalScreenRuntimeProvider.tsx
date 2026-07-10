import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { OperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import type { OperationalScreenRuntimeContext } from "@/lib/operational-screen/runtimeTypes";
import type { FrozenRuntimeInstanceContext } from "@/lib/operational-screen/runtimeInstanceContext";
import {
  getRuntimeContextStoreServerSnapshot,
  getRuntimeContextStoreSnapshot,
  subscribeToRuntimeContextStore,
} from "@/lib/operational-screen/runtimeContextStore";
import {
  useRuntimeOrchestrator,
  type RuntimeOrchestratorValue,
} from "@/lib/operational-screen/useRuntimeOrchestrator";

/**
 * RUNTIME-BOOTSTRAP-CONTRACT-1 — canonical runtime authority.
 * RUNTIME-CONTEXT-SUBSCRIPTIONS-1 — instance snapshots published via RuntimeContextStore.
 *
 * Single owner of the Runtime Context, bootstrap phase, configuration,
 * capabilities, fingerprint, runtime status, and role. Role panels consume
 * this provider via hooks (no prop-drilling, no duplicated ownership).
 */
const RuntimeContext = createContext<RuntimeOrchestratorValue | null>(null);

export function OperationalScreenRuntimeProvider({
  credentials,
  children,
}: {
  credentials: OperationalScreenCredentials;
  children: ReactNode;
}) {
  const value = useRuntimeOrchestrator(credentials);
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/** Access the full runtime authority (phase, context, lifecycle actions, diagnostics). */
export function useScreenRuntime(): RuntimeOrchestratorValue {
  const value = useContext(RuntimeContext);
  if (!value) {
    throw new Error("useScreenRuntime must be used within OperationalScreenRuntimeProvider");
  }
  return value;
}

/** Access the assembled Runtime Context. Throws when context is not yet ready. */
export function useRuntimeContext(): OperationalScreenRuntimeContext {
  const { context } = useScreenRuntime();
  if (!context) {
    throw new Error("Runtime context is not ready");
  }
  return context;
}

/** RUNTIME-INSTANCE-CONTEXT-1 — immutable instance snapshot via RuntimeContextStore. */
export function useRuntimeInstanceContext(): FrozenRuntimeInstanceContext {
  const snapshot = useSyncExternalStore(
    subscribeToRuntimeContextStore,
    getRuntimeContextStoreSnapshot,
    getRuntimeContextStoreServerSnapshot
  );
  if (!snapshot) {
    throw new Error("Runtime instance context is not ready");
  }
  return snapshot;
}

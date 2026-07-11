import type { RuntimeOrchestratorCoreValue } from "./useRuntimeOrchestrator";

/** @internal Orchestrator operations wired into the public Runtime Action API. */
export type RuntimeOrchestratorActionSource = Pick<
  RuntimeOrchestratorCoreValue,
  "refresh" | "reloadConfiguration" | "unpair" | "retry"
>;

/** RUNTIME-CONTEXT-ACTIONS-1 — stable Runtime execution surface (Public Runtime API type). */
export type RuntimeActions = {
  /**
   * Refreshes dynamic runtime fields from the latest device status.
   * Post-refetch: factory.refresh → store "manual_refresh".
   */
  refresh: () => Promise<void>;
  /**
   * Reloads configuration when the server config revision has changed.
   * Post-refetch: factory.applyConfigurationReload → store "configuration_reload".
   */
  reloadConfiguration: () => Promise<void>;
  /** Clears credentials and redirects to pairing. */
  unpair: () => void;
  /** Retries status fetch after connectivity degradation (includes retry token bump). */
  retry: () => Promise<void>;
};

/** @internal Pure delegation — no store, factory, or lifecycle ownership. */
export function createRuntimeActions(source: RuntimeOrchestratorActionSource): RuntimeActions {
  return {
    refresh: () => source.refresh(),
    reloadConfiguration: () => source.reloadConfiguration(),
    unpair: () => source.unpair(),
    retry: () => source.retry(),
  };
}

import type { RuntimeOrchestratorCoreValue } from "./useRuntimeOrchestrator";

/** Orchestrator operations exposed through the Runtime Action API. */
export type RuntimeOrchestratorActionSource = Pick<
  RuntimeOrchestratorCoreValue,
  "refresh" | "reloadConfiguration" | "unpair" | "retry"
>;

/** RUNTIME-CONTEXT-ACTIONS-1 — stable Runtime execution surface. */
export type RuntimeActions = {
  /** Refreshes dynamic runtime fields from the latest device status. */
  refresh: () => Promise<void>;
  /** Reloads configuration when the server config revision has changed. */
  reloadConfiguration: () => Promise<void>;
  /** Clears credentials and redirects to pairing. */
  unpair: () => void;
  /** Retries status fetch after connectivity degradation. */
  retry: () => Promise<void>;
};

/** Pure delegation — no store, factory, or lifecycle ownership. */
export function createRuntimeActions(source: RuntimeOrchestratorActionSource): RuntimeActions {
  return {
    refresh: () => source.refresh(),
    reloadConfiguration: () => source.reloadConfiguration(),
    unpair: () => source.unpair(),
    retry: () => source.retry(),
  };
}

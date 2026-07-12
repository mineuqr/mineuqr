import type { BootstrapPhase } from "../runtimeTypes";

/**
 * RUNTIME-RECONCILIATION-ARCHITECTURE-1 — orchestration lifecycle phases.
 *
 * Distinct from BootstrapPhase (connectivity/lifecycle). OrchestrationPhase
 * governs whether bootstrap or reconciliation may execute.
 */
export const ORCHESTRATION_PHASES = [
  "UNINITIALIZED",
  "BOOTSTRAPPING",
  "READY",
  "RUNNING",
  "RECONCILING",
] as const;

export type OrchestrationPhase = (typeof ORCHESTRATION_PHASES)[number];

/** Maps the approved bootstrap state machine phase to orchestration authority. */
export function orchestrationPhaseFromBootstrap(phase: BootstrapPhase): OrchestrationPhase {
  switch (phase) {
    case "loading":
      return "UNINITIALIZED";
    case "validating":
    case "context_ready":
    case "heartbeat_active":
      return "BOOTSTRAPPING";
    case "running":
    case "blocked":
      return "RUNNING";
    case "degraded":
      return "RUNNING";
    case "revoked":
    case "pairing_redirect":
      return "UNINITIALIZED";
    default:
      return "UNINITIALIZED";
  }
}

export function bootstrapMayExecute(phase: BootstrapPhase): boolean {
  return phase === "validating";
}

export function reconciliationMayExecute(phase: BootstrapPhase): boolean {
  return phase === "running" || phase === "blocked" || phase === "degraded";
}

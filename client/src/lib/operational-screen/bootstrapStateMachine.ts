/**
 * RUNTIME-BOOTSTRAP-CONTRACT-1 — canonical bootstrap state machine.
 *
 * Pure, side-effect-free transition function. Every phase is explicit and every
 * transition is declared. No implicit phase jumps are permitted: callers MUST
 * route all lifecycle changes through `transition()`.
 *
 * Approved lifecycle:
 *   Loading → Validating → ContextReady → HeartbeatActive → Running
 *   Running → Blocked | Degraded | Revoked
 *   Degraded → Running
 *   Revoked → PairingRedirect
 *   Loading → PairingRedirect (no credentials)
 */

import type { BootstrapPhase } from "./runtimeTypes";

export type BootstrapEvent =
  | { type: "CREDENTIALS_MISSING" }
  | { type: "CREDENTIALS_FOUND" }
  | { type: "STATUS_RECEIVED" }
  | { type: "CONTEXT_ASSEMBLED" }
  | { type: "HEARTBEAT_STARTED" }
  | { type: "RUN_SUPPORTED" }
  | { type: "RUN_BLOCKED" }
  | { type: "NETWORK_FAILURE" }
  | { type: "NETWORK_RECOVERED" }
  | { type: "AUTH_REVOKED" }
  | { type: "PAIRING_REDIRECTED" };

/** Declares which phases each phase may legally transition into. */
export const ALLOWED_TRANSITIONS: Record<BootstrapPhase, BootstrapPhase[]> = {
  loading: ["validating", "pairing_redirect"],
  validating: ["context_ready", "revoked", "degraded"],
  context_ready: ["heartbeat_active", "revoked", "degraded"],
  heartbeat_active: ["running", "blocked", "revoked", "degraded"],
  running: ["blocked", "degraded", "revoked", "running"],
  blocked: ["degraded", "revoked", "blocked"],
  degraded: ["running", "blocked", "revoked"],
  revoked: ["pairing_redirect"],
  pairing_redirect: ["validating"],
};

export const INITIAL_PHASE: BootstrapPhase = "loading";

export function canTransition(from: BootstrapPhase, to: BootstrapPhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Computes the next phase for an event. Returns the same phase when the event
 * does not apply to the current phase (no implicit jump). Illegal target phases
 * are rejected by `canTransition` and collapse to the current phase.
 */
export function transition(current: BootstrapPhase, event: BootstrapEvent): BootstrapPhase {
  const target = resolveTarget(current, event);
  if (target === current) return current;
  return canTransition(current, target) ? target : current;
}

function resolveTarget(current: BootstrapPhase, event: BootstrapEvent): BootstrapPhase {
  switch (event.type) {
    case "CREDENTIALS_MISSING":
      return current === "loading" ? "pairing_redirect" : current;
    case "CREDENTIALS_FOUND":
      return current === "loading" ? "validating" : current;
    case "STATUS_RECEIVED":
      return current === "validating" || current === "degraded" ? "context_ready" : current;
    case "CONTEXT_ASSEMBLED":
      return current === "context_ready" ? "heartbeat_active" : current;
    case "HEARTBEAT_STARTED":
      return current === "heartbeat_active" ? "running" : current;
    case "RUN_SUPPORTED":
      return current === "running" ? "running" : current;
    case "RUN_BLOCKED":
      return current === "heartbeat_active" || current === "running" || current === "degraded"
        ? "blocked"
        : current;
    case "NETWORK_FAILURE":
      return current === "running" || current === "blocked" ? "degraded" : current;
    case "NETWORK_RECOVERED":
      return current === "degraded" ? "running" : current;
    case "AUTH_REVOKED":
      return current === "revoked" || current === "pairing_redirect" ? current : "revoked";
    case "PAIRING_REDIRECTED":
      return current === "revoked" ? "pairing_redirect" : current;
    default:
      return current;
  }
}

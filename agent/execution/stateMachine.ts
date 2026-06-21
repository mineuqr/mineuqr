/**
 * THERMAL-PRINTING-6D Phase-2 — local job state machine.
 */
import type { LocalJobState } from "./executionTypes";

export class LocalJobStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalJobStateError";
  }
}

const ALLOWED_LOCAL_JOB_TRANSITIONS: Record<LocalJobState, readonly LocalJobState[]> = {
  received: ["validated"],
  validated: ["prepared"],
  prepared: ["acknowledged", "delivered"],
  acknowledged: ["delivered"],
  delivered: [],
};

export function canTransitionLocalJobState(from: LocalJobState, to: LocalJobState): boolean {
  return ALLOWED_LOCAL_JOB_TRANSITIONS[from].includes(to);
}

export function assertLocalJobStateTransition(from: LocalJobState, to: LocalJobState): void {
  if (!canTransitionLocalJobState(from, to)) {
    throw new LocalJobStateError(`Invalid local job state transition: ${from} -> ${to}`);
  }
}

export function getNextLocalJobState(current: LocalJobState): LocalJobState | null {
  const allowed = ALLOWED_LOCAL_JOB_TRANSITIONS[current];
  return allowed.length > 0 ? allowed[0]! : null;
}

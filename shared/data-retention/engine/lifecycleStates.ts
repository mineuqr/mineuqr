/**
 * DATA-RETENTION-PLATFORM-1 — canonical lifecycle order (no skipping).
 */

import type { RetentionLifecycleState } from "../types";

/** Strict linear order — each step advances by at most one state. */
export const LIFECYCLE_ORDER: readonly RetentionLifecycleState[] = [
  "ACTIVE",
  "DISPLAY_WINDOW",
  "OPERATIONAL_RETENTION",
  "ARCHIVE_ELIGIBLE",
  "ARCHIVED",
  "RESTORABLE",
  "PURGE_ELIGIBLE",
  "PURGED",
] as const;

export function lifecycleIndex(state: RetentionLifecycleState): number {
  return LIFECYCLE_ORDER.indexOf(state);
}

export function isLifecycleTerminal(state: RetentionLifecycleState): boolean {
  return state === "PURGED";
}

export function nextLifecycleState(
  from: RetentionLifecycleState
): RetentionLifecycleState | null {
  const i = lifecycleIndex(from);
  if (i < 0 || i >= LIFECYCLE_ORDER.length - 1) return null;
  return LIFECYCLE_ORDER[i + 1]!;
}

export function isAdjacentTransition(
  from: RetentionLifecycleState,
  to: RetentionLifecycleState
): boolean {
  if (from === to) return true;
  return nextLifecycleState(from) === to;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000);
}

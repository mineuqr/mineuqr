/**
 * DATA-RETENTION-PLATFORM-1 — deterministic lifecycle engine.
 * Idempotent adjacent transitions only. No domain business rules.
 */

import {
  daysBetween,
  isAdjacentTransition,
  isLifecycleTerminal,
  lifecycleIndex,
  nextLifecycleState,
} from "./lifecycleStates";
import { holdsBlockArchive, holdsBlockPurge } from "../holds/retentionHolds";
import type {
  RetentionEligibility,
  RetentionHoldKind,
  RetentionLifecycleState,
  RetentionPolicy,
  RetentionTimestamps,
  RetentionTransitionResult,
} from "../types";

export type EvaluateLifecycleInput = Readonly<{
  policy: RetentionPolicy;
  timestamps: RetentionTimestamps;
  /** Caller-owned current DRAP state (starts ACTIVE). */
  currentState: RetentionLifecycleState;
  nowIso: string;
  holdKinds?: readonly RetentionHoldKind[];
  /** When true, subject is still live — remain ACTIVE (domain signal). */
  entityOpen?: boolean;
}>;

/**
 * Derive the furthest eligibility stage from clocks + policy + holds.
 * Does not mutate; used to decide the next adjacent step.
 */
export function deriveTargetLifecycleState(
  input: EvaluateLifecycleInput
): RetentionLifecycleState {
  const { policy, timestamps, currentState, nowIso } = input;
  const holdKinds = input.holdKinds ?? [];

  if (!policy.enabled) return currentState;
  if (timestamps.purgedAt) return "PURGED";
  if (isLifecycleTerminal(currentState)) return "PURGED";
  if (input.entityOpen) return "ACTIVE";

  const ageDays = daysBetween(timestamps.referenceAt, nowIso);

  if (timestamps.archivedAt) {
    const archiveAge = daysBetween(timestamps.archivedAt, nowIso);
    if (
      policy.purgeEnabled &&
      !holdsBlockPurge(holdKinds) &&
      archiveAge >= policy.archiveRetentionDays
    ) {
      return "PURGE_ELIGIBLE";
    }
    if (policy.restoreEnabled && archiveAge < policy.archiveRetentionDays) {
      return "RESTORABLE";
    }
    return "ARCHIVED";
  }

  if (ageDays < policy.displayWindowDays) {
    return "DISPLAY_WINDOW";
  }
  if (ageDays < policy.operationalRetentionDays) {
    return "OPERATIONAL_RETENTION";
  }
  if (policy.archiveEnabled && !holdsBlockArchive(holdKinds)) {
    return "ARCHIVE_ELIGIBLE";
  }
  return "OPERATIONAL_RETENTION";
}

export function evaluateRetentionEligibility(
  input: EvaluateLifecycleInput
): RetentionEligibility {
  const holdKinds = input.holdKinds ?? [];
  const holdActive = holdKinds.length > 0;
  const target = deriveTargetLifecycleState(input);
  const { policy, timestamps } = input;
  const ageDays = daysBetween(timestamps.referenceAt, input.nowIso);
  const reasons: string[] = [];

  if (!policy.enabled) reasons.push("policy_disabled");
  if (holdActive) reasons.push("hold_active");

  const inDisplayWindow =
    !timestamps.archivedAt &&
    !timestamps.purgedAt &&
    ageDays < policy.displayWindowDays;

  const archiveEligible =
    target === "ARCHIVE_ELIGIBLE" &&
    policy.archiveEnabled &&
    !holdsBlockArchive(holdKinds);

  const restoreEligible =
    (target === "RESTORABLE" || target === "ARCHIVED") &&
    policy.restoreEnabled &&
    Boolean(timestamps.archivedAt) &&
    !timestamps.purgedAt;

  const purgeEligible =
    target === "PURGE_ELIGIBLE" &&
    policy.purgeEnabled &&
    !holdsBlockPurge(holdKinds) &&
    policy.entityType !== "settlement_record";

  if (!archiveEligible && target === "ARCHIVE_ELIGIBLE") {
    reasons.push("archive_blocked");
  }
  if (holdsBlockPurge(holdKinds)) reasons.push("purge_blocked_by_hold");

  return {
    state: target,
    inDisplayWindow,
    archiveEligible,
    restoreEligible,
    purgeEligible,
    holdActive,
    holdKinds,
    reasons,
  };
}

/**
 * Advance at most one adjacent state toward eligibility target.
 * Idempotent when already at/beyond target or same state.
 */
export function transitionLifecycleState(input: {
  from: RetentionLifecycleState;
  to: RetentionLifecycleState;
}): RetentionTransitionResult {
  const { from, to } = input;
  if (from === to) {
    return {
      from,
      to,
      applied: false,
      idempotent: true,
      reasons: ["already_in_state"],
    };
  }
  if (!isAdjacentTransition(from, to)) {
    return {
      from,
      to,
      applied: false,
      idempotent: false,
      reasons: ["non_adjacent_transition_forbidden"],
    };
  }
  if (isLifecycleTerminal(from)) {
    return {
      from,
      to,
      applied: false,
      idempotent: true,
      reasons: ["terminal_state"],
    };
  }
  return {
    from,
    to,
    applied: true,
    idempotent: false,
    reasons: ["advanced"],
  };
}

/** Step once toward derived target (deterministic). */
export function advanceLifecycleTowardEligibility(
  input: EvaluateLifecycleInput
): RetentionTransitionResult {
  const eligibility = evaluateRetentionEligibility(input);
  const from = input.currentState;
  const target = eligibility.state;

  if (from === target) {
    return transitionLifecycleState({ from, to: from });
  }

  const next = nextLifecycleState(from);
  if (!next) {
    return {
      from,
      to: from,
      applied: false,
      idempotent: true,
      reasons: ["no_next_state"],
    };
  }

  if (lifecycleIndex(target) <= lifecycleIndex(from)) {
    return {
      from,
      to: from,
      applied: false,
      idempotent: true,
      reasons: ["target_not_ahead"],
    };
  }

  return transitionLifecycleState({ from, to: next });
}

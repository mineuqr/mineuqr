/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Platform Read Freshness Governance — client cache merge policy only.
 * Does not alter events, projections, or aggregates.
 */

import {
  getOrderStatusWriteConfirmation,
  isStaleRelativeToConfirmedWrite,
  releaseOrderStatusWriteConfirmationIfCaughtUp,
} from "./confirmedWriteRegistry";
import {
  compareOrderStatusFreshness,
  normalizeOrderFreshnessStatus,
} from "./orderStatusRank";

export const READ_FRESHNESS_PROGRAM =
  "ORDER-STATE-PROPAGATION-REMEDIATION-1" as const;

export type ReadFreshnessDecision =
  | "accept_incoming"
  | "keep_existing"
  | "accept_equal";

export type ReadFreshnessMergeReason =
  | "no_existing"
  | "incoming_newer_status"
  | "existing_newer_status"
  | "equal_status"
  | "protected_by_confirmed_write"
  | "incomparable_accept_incoming";

export type ReadFreshnessObservation = {
  decision: ReadFreshnessDecision;
  reason: ReadFreshnessMergeReason;
  orderId?: number;
  existingStatus?: string;
  incomingStatus?: string;
};

export type ReadFreshnessCounters = {
  accepted: number;
  rejectedStale: number;
  equal: number;
};

const counters: ReadFreshnessCounters = {
  accepted: 0,
  rejectedStale: 0,
  equal: 0,
};

export function getReadFreshnessCounters(): Readonly<ReadFreshnessCounters> {
  return { ...counters };
}

export function resetReadFreshnessCounters(): void {
  counters.accepted = 0;
  counters.rejectedStale = 0;
  counters.equal = 0;
}

function record(decision: ReadFreshnessDecision): void {
  if (decision === "keep_existing") counters.rejectedStale += 1;
  else if (decision === "accept_equal") counters.equal += 1;
  else counters.accepted += 1;
}

/**
 * Decide whether an incoming read may replace existing cached status.
 *
 * Principles:
 * - Fresh Read may replace Older Read
 * - Confirmed Write may replace Older Read
 * - Older Read MUST NEVER replace Confirmed Write
 * - Without an active confirmation, equal-or-any network truth is accepted
 *   (allows mutation error rollback via setData snapshot).
 */
export function decideOrderStatusCacheReplacement(input: {
  existingStatus: string | null | undefined;
  incomingStatus: string | null | undefined;
  orderId?: number;
}): ReadFreshnessObservation {
  const existing = normalizeOrderFreshnessStatus(input.existingStatus);
  const incoming = normalizeOrderFreshnessStatus(input.incomingStatus);
  const orderId = input.orderId;

  if (existing == null) {
    if (orderId != null && isStaleRelativeToConfirmedWrite(orderId, incoming)) {
      const observation: ReadFreshnessObservation = {
        decision: "keep_existing",
        reason: "protected_by_confirmed_write",
        orderId,
        incomingStatus: incoming ?? input.incomingStatus ?? undefined,
      };
      record(observation.decision);
      return observation;
    }
    const observation: ReadFreshnessObservation = {
      decision: "accept_incoming",
      reason: "no_existing",
      orderId,
      incomingStatus: incoming ?? input.incomingStatus ?? undefined,
    };
    record(observation.decision);
    if (orderId != null) {
      releaseOrderStatusWriteConfirmationIfCaughtUp(orderId, incoming);
    }
    return observation;
  }

  if (incoming == null) {
    const observation: ReadFreshnessObservation = {
      decision: "keep_existing",
      reason: "incomparable_accept_incoming",
      orderId,
      existingStatus: existing,
      incomingStatus: input.incomingStatus ?? undefined,
    };
    record(observation.decision);
    return observation;
  }

  if (orderId != null && isStaleRelativeToConfirmedWrite(orderId, incoming)) {
    const observation: ReadFreshnessObservation = {
      decision: "keep_existing",
      reason: "protected_by_confirmed_write",
      orderId,
      existingStatus: existing,
      incomingStatus: incoming,
    };
    record(observation.decision);
    return observation;
  }

  const cmp = compareOrderStatusFreshness(existing, incoming);
  if (cmp === "incoming") {
    const observation: ReadFreshnessObservation = {
      decision: "accept_incoming",
      reason: "incoming_newer_status",
      orderId,
      existingStatus: existing,
      incomingStatus: incoming,
    };
    record(observation.decision);
    if (orderId != null) {
      releaseOrderStatusWriteConfirmationIfCaughtUp(orderId, incoming);
    }
    return observation;
  }
  if (cmp === "existing") {
    // No active confirmation (checked above) — allow regression for rollback / foreign truth.
    const observation: ReadFreshnessObservation = {
      decision: "accept_incoming",
      reason: "incomparable_accept_incoming",
      orderId,
      existingStatus: existing,
      incomingStatus: incoming,
    };
    record(observation.decision);
    return observation;
  }
  if (cmp === "equal") {
    const observation: ReadFreshnessObservation = {
      decision: "accept_equal",
      reason: "equal_status",
      orderId,
      existingStatus: existing,
      incomingStatus: incoming,
    };
    record(observation.decision);
    if (orderId != null) {
      releaseOrderStatusWriteConfirmationIfCaughtUp(orderId, incoming);
    }
    return observation;
  }

  const observation: ReadFreshnessObservation = {
    decision: "accept_incoming",
    reason: "incomparable_accept_incoming",
    orderId,
    existingStatus: existing,
    incomingStatus: incoming,
  };
  record(observation.decision);
  return observation;
}

export type StatusBearing = {
  orderId: number;
  status: string;
};

/**
 * Merge a single order-shaped row under Read Freshness Governance.
 */
export function mergeStatusBearingItem<T extends StatusBearing>(
  existing: T | undefined,
  incoming: T,
  onDecision?: (observation: ReadFreshnessObservation) => void
): T {
  const observation = decideOrderStatusCacheReplacement({
    existingStatus: existing?.status,
    incomingStatus: incoming.status,
    orderId: incoming.orderId,
  });
  onDecision?.(observation);

  if (observation.decision === "keep_existing") {
    const confirmed = getOrderStatusWriteConfirmation(incoming.orderId);
    const heldStatus = confirmed?.status ?? existing?.status ?? incoming.status;
    const base = existing ?? incoming;
    return {
      ...incoming,
      status: heldStatus,
      ...("readyAt" in base || "readyAt" in incoming
        ? {
            readyAt:
              (base as T & { readyAt?: string | null }).readyAt ??
              (incoming as T & { readyAt?: string | null }).readyAt ??
              null,
          }
        : {}),
    };
  }

  return incoming;
}

/**
 * Merge list payloads keyed by orderId. Items present only in existing and absent
 * from incoming are dropped (left the filtered read set).
 */
export function mergeStatusBearingList<T extends StatusBearing>(
  existing: T[] | undefined,
  incoming: T[],
  onDecision?: (observation: ReadFreshnessObservation) => void
): T[] {
  if (!existing?.length) {
    for (const item of incoming) {
      onDecision?.(
        decideOrderStatusCacheReplacement({
          existingStatus: undefined,
          incomingStatus: item.status,
          orderId: item.orderId,
        })
      );
    }
    return incoming;
  }

  const existingById = new Map(existing.map((item) => [item.orderId, item]));
  return incoming.map((item) =>
    mergeStatusBearingItem(existingById.get(item.orderId), item, onDecision)
  );
}

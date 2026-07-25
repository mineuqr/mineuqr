/**
 * DATA-RETENTION-PLATFORM-1 — Legal / Financial / Manual holds.
 * When active: purge prohibited; archive allowed if policy permits.
 */

import type {
  RetentionHold,
  RetentionHoldKind,
  RetentionSubjectRef,
} from "../types";

export type RetentionHoldRegistry = {
  place(hold: RetentionHold): void;
  release(holdId: string): void;
  listActive(subject: RetentionSubjectRef): readonly RetentionHold[];
  hasActiveHold(subject: RetentionSubjectRef): boolean;
  activeKinds(subject: RetentionSubjectRef): readonly RetentionHoldKind[];
  clear(): void;
};

function sameSubject(a: RetentionHold, b: RetentionSubjectRef): boolean {
  return (
    a.restaurantId === b.restaurantId &&
    a.entityType === b.entityType &&
    a.entityId === b.entityId
  );
}

export function createRetentionHoldRegistry(): RetentionHoldRegistry {
  const store = new Map<string, RetentionHold>();

  return {
    place(hold: RetentionHold): void {
      if (!hold.active) {
        throw new Error("Cannot place inactive hold");
      }
      if (
        !Number.isInteger(hold.restaurantId) ||
        hold.restaurantId <= 0
      ) {
        throw new Error("Hold restaurantId must be a positive integer");
      }
      store.set(hold.holdId, Object.freeze({ ...hold }));
    },
    release(holdId: string): void {
      const existing = store.get(holdId);
      if (!existing) return;
      store.set(
        holdId,
        Object.freeze({ ...existing, active: false })
      );
    },
    listActive(subject: RetentionSubjectRef): readonly RetentionHold[] {
      return [...store.values()].filter(
        (h) => h.active && sameSubject(h, subject)
      );
    },
    hasActiveHold(subject: RetentionSubjectRef): boolean {
      return [...store.values()].some(
        (h) => h.active && sameSubject(h, subject)
      );
    },
    activeKinds(subject: RetentionSubjectRef): readonly RetentionHoldKind[] {
      return this.listActive(subject).map((h) => h.kind);
    },
    clear: () => store.clear(),
  };
}

/** Purge is always prohibited under any active hold. */
export function holdsBlockPurge(activeKinds: readonly RetentionHoldKind[]): boolean {
  return activeKinds.length > 0;
}

/** Archive remains allowed under hold if policy.archiveEnabled (caller checks policy). */
export function holdsBlockArchive(
  _activeKinds: readonly RetentionHoldKind[]
): boolean {
  return false;
}

/**
 * DATA-RETENTION-PLATFORM-1 — domain extension API.
 * Domains adopt via adapters. No domain modifications in this program.
 */

import type {
  RetentionEntityType,
  RetentionSubjectRef,
  RetentionTimestamps,
} from "../types";

/**
 * Domain-provided port. DRAP never imports domain modules.
 */
export type RetentionAdapter = Readonly<{
  entityType: RetentionEntityType;
  /** Resolve whether the subject exists in the tenant. */
  resolveEntity: (
    subject: RetentionSubjectRef
  ) => Promise<boolean> | boolean;
  /** Resolve aging timestamps (domain-owned fields). */
  resolveTimestamps: (
    subject: RetentionSubjectRef
  ) => Promise<RetentionTimestamps | null> | RetentionTimestamps | null;
  /** Resolve owning restaurant (cross-tenant safety). */
  resolveOwner: (
    subject: RetentionSubjectRef
  ) => Promise<number | null> | number | null;
  /**
   * Domain soft-eligibility signal only (e.g. already closed).
   * Not a retention policy.
   */
  resolveEligibility: (
    subject: RetentionSubjectRef
  ) =>
    | Promise<Readonly<{ eligibleForRetentionEvaluation: boolean; reason?: string }>>
    | Readonly<{ eligibleForRetentionEvaluation: boolean; reason?: string }>;
}>;

export type RetentionAdapterRegistry = {
  register(adapter: RetentionAdapter): void;
  get(entityType: RetentionEntityType): RetentionAdapter | undefined;
  list(): readonly RetentionAdapter[];
  clear(): void;
};

export function createRetentionAdapterRegistry(): RetentionAdapterRegistry {
  const store = new Map<RetentionEntityType, RetentionAdapter>();
  return {
    register(adapter) {
      if (store.has(adapter.entityType)) {
        throw new Error(
          `RetentionAdapter already registered for ${adapter.entityType}`
        );
      }
      store.set(adapter.entityType, adapter);
    },
    get: (entityType) => store.get(entityType),
    list: () => [...store.values()],
    clear: () => store.clear(),
  };
}

/**
 * Tenant isolation guard before evaluation.
 */
export async function assertAdapterTenantIsolation(
  adapter: RetentionAdapter,
  subject: RetentionSubjectRef
): Promise<void> {
  const owner = await adapter.resolveOwner(subject);
  if (owner == null) {
    throw new Error("Retention subject owner not found");
  }
  if (owner !== subject.restaurantId) {
    throw new Error("Cross-tenant retention access denied (DR-08)");
  }
}

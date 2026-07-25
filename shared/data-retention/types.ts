/**
 * DATA-RETENTION-PLATFORM-1 / ADR-ARCH-031 — canonical DRAP types.
 * Lifecycle policy only. Domains own data.
 */

import type {
  RETENTION_ENTITY_TYPES,
  RETENTION_HOLD_KINDS,
  RETENTION_LIFECYCLE_STATES,
  RETENTION_SCHEDULER_HOOKS,
} from "./constants";

export type RetentionEntityType = (typeof RETENTION_ENTITY_TYPES)[number];
export type RetentionLifecycleState =
  (typeof RETENTION_LIFECYCLE_STATES)[number];
export type RetentionHoldKind = (typeof RETENTION_HOLD_KINDS)[number];
export type RetentionSchedulerHook =
  (typeof RETENTION_SCHEDULER_HOOKS)[number];

/**
 * Canonical retention policy (logical). No persistence assumptions.
 */
export type RetentionPolicy = Readonly<{
  policyId: string;
  entityType: RetentionEntityType;
  enabled: boolean;
  displayWindowDays: number;
  operationalRetentionDays: number;
  archiveRetentionDays: number;
  archiveEnabled: boolean;
  restoreEnabled: boolean;
  purgeEnabled: boolean;
  legalHoldSupported: boolean;
  defaultPolicy: boolean;
  restaurantOverrideAllowed: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Optional restaurant scope; null/undefined = global default. */
  restaurantId?: number | null;
}>;

export type RetentionHold = Readonly<{
  holdId: string;
  kind: RetentionHoldKind;
  restaurantId: number;
  entityType: RetentionEntityType;
  entityId: string;
  active: boolean;
  reason?: string;
  placedAt: string;
  placedBy?: string;
}>;

export type RetentionSubjectRef = Readonly<{
  restaurantId: number;
  entityType: RetentionEntityType;
  entityId: string;
}>;

export type RetentionTimestamps = Readonly<{
  /** Business clock for aging (e.g. closedAt / completedAt / createdAt). */
  referenceAt: string;
  archivedAt?: string | null;
  purgedAt?: string | null;
}>;

export type RetentionEligibility = Readonly<{
  state: RetentionLifecycleState;
  inDisplayWindow: boolean;
  archiveEligible: boolean;
  restoreEligible: boolean;
  purgeEligible: boolean;
  holdActive: boolean;
  holdKinds: readonly RetentionHoldKind[];
  reasons: readonly string[];
}>;

export type PolicyResolutionSource =
  | "restaurant_override"
  | "global_default"
  | "platform_fallback";

export type ResolvedRetentionPolicy = Readonly<{
  policy: RetentionPolicy;
  source: PolicyResolutionSource;
}>;

export type RetentionFeatureFlags = Readonly<{
  drapEnabled: boolean;
  schedulerEnabled: boolean;
  archiveJobsEnabled: boolean;
  restoreJobsEnabled: boolean;
  purgeJobsEnabled: boolean;
  simulationMode: boolean;
  dryRunDefault: boolean;
}>;

export type RetentionTransitionResult = Readonly<{
  from: RetentionLifecycleState;
  to: RetentionLifecycleState;
  applied: boolean;
  idempotent: boolean;
  reasons: readonly string[];
}>;

export type RetentionAuditEvent = Readonly<{
  eventType:
    | "policy_resolved"
    | "lifecycle_evaluated"
    | "lifecycle_transition"
    | "hold_placed"
    | "hold_released"
    | "scheduler_hook"
    | "dry_run"
    | "simulation";
  at: string;
  restaurantId?: number;
  entityType?: RetentionEntityType;
  entityId?: string;
  detail: Readonly<Record<string, unknown>>;
}>;

export type RetentionMetricSnapshot = Readonly<{
  policiesRegistered: number;
  holdsActive: number;
  transitionsAttempted: number;
  transitionsApplied: number;
  dryRuns: number;
  simulations: number;
}>;

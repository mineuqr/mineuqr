/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Commercial lifecycle projection for Subscription runtime (I-CPL dual-plane).
 * DB enum remains trial|active|canceled|expired; Grace/Suspended via lifecycle signals.
 */

import type { SubscriptionStatus } from "@commercial/planTypes";

/** Architecture Subscription Instance states (commercial runtime projection). */
export const COMMERCIAL_LIFECYCLE_STATES = [
  "draft",
  "trial",
  "active",
  "grace",
  "suspended",
  "expired",
  "cancelled",
  "archived",
] as const;

export type CommercialLifecycleState =
  (typeof COMMERCIAL_LIFECYCLE_STATES)[number];

/** Optional durable-ready signals (Billing future / admin / tests). */
export type LifecycleSignals = {
  /** When set and now < graceUntil while base would be expired/non-pay, project Grace. */
  graceUntil?: string | Date | null;
  /** Explicit suspension (non-grace block). */
  suspended?: boolean;
  /** Grandfathered mode (Snapshot refs Deprecated/Retired Version). */
  grandfathered?: boolean;
};

export type LifecycleSyncInput = {
  dbStatus: SubscriptionStatus;
  trialEndsAt: string | Date | null;
  currentPeriodEnd: string | Date | null;
  now: Date;
  signals?: LifecycleSignals | null;
};

export type LifecycleSyncResult = {
  state: CommercialLifecycleState;
  /** Entitlements commercially enabled for this state. */
  entitlementsEnabled: boolean;
  grandfathered: boolean;
  reason: string;
};

function parseInstant(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isBefore(end: string | Date | null | undefined, now: Date): boolean {
  const instant = parseInstant(end);
  if (instant == null) return false;
  return now < instant;
}

/**
 * Project DB subscription row + signals → commercial lifecycle state.
 * Does not read Catalog.
 */
export function syncCommercialLifecycle(
  input: LifecycleSyncInput
): LifecycleSyncResult {
  const signals = input.signals ?? {};
  const grandfathered = signals.grandfathered === true;

  if (signals.suspended === true) {
    return {
      state: "suspended",
      entitlementsEnabled: false,
      grandfathered,
      reason: "signal_suspended",
    };
  }

  const { dbStatus, now } = input;

  if (dbStatus === "canceled") {
    return {
      state: "cancelled",
      entitlementsEnabled: false,
      grandfathered,
      reason: "db_canceled",
    };
  }

  if (dbStatus === "expired") {
    if (isBefore(signals.graceUntil, now)) {
      return {
        state: "grace",
        entitlementsEnabled: true,
        grandfathered,
        reason: "grace_after_expired",
      };
    }
    return {
      state: "expired",
      entitlementsEnabled: false,
      grandfathered,
      reason: "db_expired",
    };
  }

  if (dbStatus === "trial") {
    if (isBefore(input.trialEndsAt, now)) {
      return {
        state: "trial",
        entitlementsEnabled: true,
        grandfathered,
        reason: "trial_valid",
      };
    }
    if (isBefore(signals.graceUntil, now)) {
      return {
        state: "grace",
        entitlementsEnabled: true,
        grandfathered,
        reason: "grace_after_trial",
      };
    }
    return {
      state: "expired",
      entitlementsEnabled: false,
      grandfathered,
      reason: "trial_ended",
    };
  }

  if (dbStatus === "active") {
    if (isBefore(input.currentPeriodEnd, now)) {
      return {
        state: "active",
        entitlementsEnabled: true,
        grandfathered,
        reason: "active_valid",
      };
    }
    if (isBefore(signals.graceUntil, now)) {
      return {
        state: "grace",
        entitlementsEnabled: true,
        grandfathered,
        reason: "grace_after_period",
      };
    }
    return {
      state: "expired",
      entitlementsEnabled: false,
      grandfathered,
      reason: "period_ended",
    };
  }

  return {
    state: "expired",
    entitlementsEnabled: false,
    grandfathered,
    reason: "unknown_status",
  };
}

/** States that enable Snapshot-derived features/limits. */
export function lifecycleEnablesEntitlements(
  state: CommercialLifecycleState
): boolean {
  return state === "trial" || state === "active" || state === "grace";
}

import type { userSubscriptions } from "../drizzle/schema";
import { parseStoredUtcInstant } from "@shared/utils/timezone";

export type UserSubscriptionRow = typeof userSubscriptions.$inferSelect;

/** Free / basic plan — not eligible for table ordering. */
export const BASIC_FREE_PLAN_ID = 30001;

export type EntitlementReason =
  | "entitled"
  | "no_subscription"
  | "status_not_entitled"
  | "period_expired"
  | "missing_trial_end"
  | "missing_period_end"
  | "plan_not_found"
  | "plan_basic_free";

export type EntitlementSource = "none" | "subscription" | "plan";

export type SubscriptionEntitlement = {
  isEntitled: boolean;
  reason: EntitlementReason;
  status: UserSubscriptionRow["status"] | null;
  source: EntitlementSource;
};

/**
 * Canonical period/status entitlement (trialEndsAt for trial, currentPeriodEnd for active).
 * Active/trial rows with elapsed periods are not entitled.
 */
export function resolveSubscriptionEntitlement(
  subscription: UserSubscriptionRow | null | undefined,
  now: Date = new Date()
): SubscriptionEntitlement {
  if (!subscription) {
    return {
      isEntitled: false,
      reason: "no_subscription",
      status: null,
      source: "none",
    };
  }

  const { status } = subscription;

  if (status === "canceled" || status === "expired") {
    return {
      isEntitled: false,
      reason: "status_not_entitled",
      status,
      source: "subscription",
    };
  }

  if (status === "trial") {
    const trialEnd = parseStoredUtcInstant(subscription.trialEndsAt);
    if (!subscription.trialEndsAt || trialEnd == null) {
      return {
        isEntitled: false,
        reason: "missing_trial_end",
        status,
        source: "subscription",
      };
    }
    if (now >= trialEnd) {
      return {
        isEntitled: false,
        reason: "period_expired",
        status,
        source: "subscription",
      };
    }
    return {
      isEntitled: true,
      reason: "entitled",
      status,
      source: "subscription",
    };
  }

  if (status === "active") {
    const periodEnd = parseStoredUtcInstant(subscription.currentPeriodEnd);
    if (!subscription.currentPeriodEnd || periodEnd == null) {
      return {
        isEntitled: false,
        reason: "missing_period_end",
        status,
        source: "subscription",
      };
    }
    if (now >= periodEnd) {
      return {
        isEntitled: false,
        reason: "period_expired",
        status,
        source: "subscription",
      };
    }
    return {
      isEntitled: true,
      reason: "entitled",
      status,
      source: "subscription",
    };
  }

  return {
    isEntitled: false,
    reason: "status_not_entitled",
    status,
    source: "subscription",
  };
}

/** Table ordering: entitled subscription + non-basic plan. */
export function resolveTableOrderingEntitlement(
  subscription: UserSubscriptionRow | null | undefined,
  plan: { id: number } | null | undefined,
  now: Date = new Date()
): SubscriptionEntitlement {
  const base = resolveSubscriptionEntitlement(subscription, now);
  if (!base.isEntitled) {
    return base;
  }
  if (!plan) {
    return {
      isEntitled: false,
      reason: "plan_not_found",
      status: base.status,
      source: "plan",
    };
  }
  if (plan.id === BASIC_FREE_PLAN_ID) {
    return {
      isEntitled: false,
      reason: "plan_basic_free",
      status: base.status,
      source: "plan",
    };
  }
  return {
    isEntitled: true,
    reason: "entitled",
    status: base.status,
    source: "subscription",
  };
}

/** True if any subscription row is canonically entitled (period-valid trial/active). */
export function userHasSubscriptionEntitlement(
  rows: UserSubscriptionRow[],
  now: Date = new Date()
): boolean {
  return rows.some((r) => resolveSubscriptionEntitlement(r, now).isEntitled);
}

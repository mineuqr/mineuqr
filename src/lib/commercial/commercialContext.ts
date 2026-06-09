import { mapPlanIdToCatalogPlan } from "./planIdMapping";
import type { CatalogPlan, SubscriptionStatus, UserRole } from "./planTypes";
import type { ResolveCommercialEntitlementsInput } from "./types";

/** PG-1C.2D §3.2 — canonical subscription snapshot on CommercialContext. */
export type CommercialContextSubscription = {
  catalogPlan: CatalogPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

/** PG-1C.2D §3.2 — adapter output before resolver invocation. */
export type CommercialContext = {
  ownerId: number;
  role: UserRole;
  subscription: CommercialContextSubscription | null;
  now: Date;
};

/** Minimal subscription row fields required to build CommercialContext. */
export type SubscriptionRowForCommercialContext = {
  planId: number;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

/**
 * Pure builder: maps a canonical account-level subscription row (or absence) to CommercialContext.
 * DB loading and row picking happen in the server adapter (PG-1C.2E).
 */
export function buildCommercialContext(input: {
  ownerId: number;
  role: UserRole;
  subscriptionRow: SubscriptionRowForCommercialContext | null;
  now?: Date;
}): CommercialContext {
  const now = input.now ?? new Date();

  if (!input.subscriptionRow) {
    return {
      ownerId: input.ownerId,
      role: input.role,
      subscription: null,
      now,
    };
  }

  const catalogPlan = mapPlanIdToCatalogPlan(input.subscriptionRow.planId);
  if (!catalogPlan) {
    return {
      ownerId: input.ownerId,
      role: input.role,
      subscription: null,
      now,
    };
  }

  return {
    ownerId: input.ownerId,
    role: input.role,
    subscription: {
      catalogPlan,
      subscriptionStatus: input.subscriptionRow.status,
      trialEndsAt: input.subscriptionRow.trialEndsAt,
      currentPeriodEnd: input.subscriptionRow.currentPeriodEnd,
    },
    now,
  };
}

/** Maps CommercialContext to resolver input (PG-1C.2D §3.6). */
export function commercialContextToResolverInput(
  context: CommercialContext
): ResolveCommercialEntitlementsInput {
  return {
    ownerId: context.ownerId,
    role: context.role,
    subscription: context.subscription
      ? {
          catalogPlan: context.subscription.catalogPlan,
          status: context.subscription.subscriptionStatus,
          trialEndsAt: context.subscription.trialEndsAt,
          currentPeriodEnd: context.subscription.currentPeriodEnd,
        }
      : undefined,
    now: context.now,
  };
}

import type { CommercialAuthority } from "./dto/commercialAuthority";
import type { CommercialEntitlements } from "./dto/commercialAuthority";
import type { CommercialFeatures } from "@commercial/types";
import type { CommercialPlan, SubscriptionStatus } from "@commercial/planTypes";
import type { CommercialTrialStatus } from "./dto/commercialAuthority";

/** AR-4 Category A — plan slice. */
export type PlanSlice = {
  ownerId: number;
  planId: number | null;
  planCode: CommercialPlan;
  planName: string | null;
};

/** AR-4 Category A — entitlements slice. */
export type EntitlementsSlice = {
  ownerId: number;
  entitlements: CommercialEntitlements;
  features: CommercialFeatures;
  maxRestaurants: number | null;
};

/** AR-4 Category A — trial slice. */
export type TrialSlice = {
  ownerId: number;
  trialStatus: CommercialTrialStatus;
  subscriptionStatus: SubscriptionStatus | null;
};

/** AR-4 Category A — subscription slice. */
export type SubscriptionSlice = {
  ownerId: number;
  subscriptionId: number | null;
  subscriptionStatus: SubscriptionStatus | null;
  billingCycle: "monthly" | "yearly" | null;
  currentPeriodEnd: string | null;
};

/** AR-4 alias — same shape as EXEC-1 CommercialAuthority. */
export type OwnerCommercialState = CommercialAuthority;

export function toPlanSlice(authority: CommercialAuthority): PlanSlice {
  return {
    ownerId: authority.ownerId,
    planId: authority.planId,
    planCode: authority.planCode,
    planName: authority.planName,
  };
}

export function toEntitlementsSlice(authority: CommercialAuthority): EntitlementsSlice {
  return {
    ownerId: authority.ownerId,
    entitlements: authority.entitlements,
    features: authority.features,
    maxRestaurants: authority.maxRestaurants,
  };
}

export function toTrialSlice(authority: CommercialAuthority): TrialSlice {
  return {
    ownerId: authority.ownerId,
    trialStatus: authority.trialStatus,
    subscriptionStatus: authority.subscriptionStatus,
  };
}

export function toSubscriptionSlice(authority: CommercialAuthority): SubscriptionSlice {
  return {
    ownerId: authority.ownerId,
    subscriptionId: authority.subscriptionId,
    subscriptionStatus: authority.subscriptionStatus,
    billingCycle: authority.billingCycle,
    currentPeriodEnd: authority.currentPeriodEnd,
  };
}

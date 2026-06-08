import type { CommercialEntitlements } from "@commercial/types";
import type { CommercialPlan, SubscriptionStatus, UserRole } from "@commercial/planTypes";
import type { CommercialFeatures } from "@commercial/types";

/** Canonical read provenance — S1 account-scoped chain only (AR-4 / EXEC-1). */
export const COMMERCIAL_AUTHORITY_SOURCE = "S1_CANONICAL" as const;

export type CommercialAuthoritySource = typeof COMMERCIAL_AUTHORITY_SOURCE;

export type CommercialTrialStatus = {
  isTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number | null;
};

export type CommercialStatusSummary = {
  accountType: CommercialEntitlements["accountType"];
  isPaid: boolean;
  isEntitled: boolean;
  countsInMrr: boolean;
  countsInRevenue: boolean;
  invoiceEligible: boolean;
};

/**
 * Fully resolved commercial authority for one owner (EXEC-1 / AR-4 DTO).
 * Read-only assembly from getCommercialEntitlements + account-scoped row metadata.
 */
export type CommercialAuthority = {
  ownerId: number;
  role: UserRole;

  subscriptionId: number | null;
  subscriptionStatus: SubscriptionStatus | null;

  planId: number | null;
  planCode: CommercialPlan;
  planName: string | null;

  trialStatus: CommercialTrialStatus;

  maxRestaurants: number | null;

  features: CommercialFeatures;

  entitlements: CommercialEntitlements;

  commercialStatus: CommercialStatusSummary;

  currentPeriodEnd: string | null;
  billingCycle: "monthly" | "yearly" | null;

  authoritySource: CommercialAuthoritySource;
  resolvedAt: string;
};

export type { CommercialEntitlements };

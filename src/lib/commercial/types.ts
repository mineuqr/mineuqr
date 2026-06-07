import type {
  AccountType,
  CatalogPlan,
  CommercialPlan,
  SubscriptionStatus,
  UserRole,
} from "./planTypes";
import type { FeatureKey } from "./featureKeys";

/** `null` = unlimited (PG-1C.1B §2.3). */
export type CommercialLimitValue = number | null;

export type CommercialLimits = {
  restaurants: CommercialLimitValue;
  categories: CommercialLimitValue;
  items: CommercialLimitValue;
};

export type CommercialFeatures = Record<FeatureKey, boolean>;

export type CommercialFlags = {
  isTrial: boolean;
  isPaid: boolean;
  isEnterprise: boolean;
  isAdmin: boolean;
  countsInMrr: boolean;
  countsInRevenue: boolean;
  invoiceEligible: boolean;
};

/** Owner subscription snapshot for pure entitlement resolution (no DB in PG-1C.2B). */
export type CommercialSubscriptionSnapshot = {
  catalogPlan: CatalogPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
};

export type ResolveCommercialEntitlementsInput = {
  ownerId: number;
  role?: UserRole;
  subscription?: CommercialSubscriptionSnapshot | null;
  now?: Date;
};

/** PG-1C.1B §8 — normative authority output. */
export type CommercialEntitlements = {
  accountType: AccountType;
  plan: CommercialPlan;
  status: SubscriptionStatus | null;
  limits: CommercialLimits;
  features: CommercialFeatures;
  commercial: CommercialFlags;
};

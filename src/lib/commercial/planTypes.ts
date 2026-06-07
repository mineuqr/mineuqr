/** Resolved commercial tier / account state (PG-1C.1B §1). */
export const COMMERCIAL_PLANS = [
  "NONE",
  "TRIAL",
  "BASIC",
  "PROFESSIONAL",
  "ENTERPRISE",
  "ADMIN",
] as const;

export type CommercialPlan = (typeof COMMERCIAL_PLANS)[number];

/** Paid catalog plans stored on subscription rows. */
export const CATALOG_PLANS = ["BASIC", "PROFESSIONAL", "ENTERPRISE"] as const;

export type CatalogPlan = (typeof CATALOG_PLANS)[number];

/** PG-1C.1A §3 account classification. */
export const ACCOUNT_TYPES = ["ADMIN", "TRIAL", "PAYING", "NONE"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "canceled",
  "expired",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const USER_ROLES = ["admin", "user"] as const;

export type UserRole = (typeof USER_ROLES)[number];

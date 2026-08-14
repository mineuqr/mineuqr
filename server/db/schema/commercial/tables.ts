/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Live Commercial Plans schema. No version lifecycle tables.
 * No subscription instance tables (bindings are catalog-owned adoption links).
 */

import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  decimal,
} from "drizzle-orm/mysql-core";

const intervalUnitEnum = mysqlEnum("intervalUnit", [
  "day",
  "week",
  "month",
  "year",
]);

export const commercialPlans = mysqlTable(
  "commercial_plans",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    sortOrder: int().default(0).notNull(),
    isHidden: boolean().default(false).notNull(),
    featureBundleId: varchar({ length: 36 }),
    limitProfileId: varchar({ length: 36 }),
    trialPolicyId: varchar({ length: 36 }),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_plans_code_uq").on(t.code)]
);

export const commercialBillingCycles = mysqlTable(
  "commercial_billing_cycles",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    intervalCount: int().notNull(),
    intervalUnit: intervalUnitEnum.notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_billing_cycles_code_uq").on(t.code)]
);

export const commercialFeatureBundles = mysqlTable(
  "commercial_feature_bundles",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_feature_bundles_code_uq").on(t.code)]
);

export const commercialBundleFeatures = mysqlTable(
  "commercial_bundle_features",
  {
    id: varchar({ length: 36 }).primaryKey(),
    bundleId: varchar({ length: 36 }).notNull(),
    featureKey: varchar({ length: 128 }).notNull(),
    included: boolean().default(true).notNull(),
  },
  (t) => [
    index("commercial_bundle_features_bundle_idx").on(t.bundleId),
    uniqueIndex("commercial_bundle_features_uq").on(t.bundleId, t.featureKey),
  ]
);

export const commercialLimitProfiles = mysqlTable(
  "commercial_limit_profiles",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_limit_profiles_code_uq").on(t.code)]
);

export const commercialLimitValues = mysqlTable(
  "commercial_limit_values",
  {
    id: varchar({ length: 36 }).primaryKey(),
    profileId: varchar({ length: 36 }).notNull(),
    limitKey: varchar({ length: 128 }).notNull(),
    value: int(),
    unit: varchar({ length: 64 }),
  },
  (t) => [
    index("commercial_limit_values_profile_idx").on(t.profileId),
    uniqueIndex("commercial_limit_values_uq").on(t.profileId, t.limitKey),
  ]
);

export const commercialTrialPolicies = mysqlTable(
  "commercial_trial_policies",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    durationDays: int().notNull(),
    description: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_trial_policies_code_uq").on(t.code)]
);

export const commercialMigrationPolicies = mysqlTable(
  "commercial_migration_policies",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    requiresExplicitAction: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_migration_policies_code_uq").on(t.code)]
);

export const commercialRegions = mysqlTable(
  "commercial_regions",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    countryCode: varchar({ length: 8 }).notNull(),
    currency: varchar({ length: 8 }).notNull(),
    taxPolicyRef: varchar({ length: 128 }),
    distributionPartner: varchar({ length: 255 }),
    regulatoryNotes: text(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_regions_code_uq").on(t.code)]
);

export const commercialPrices = mysqlTable(
  "commercial_prices",
  {
    id: varchar({ length: 36 }).primaryKey(),
    planId: varchar({ length: 36 }).notNull(),
    billingCycleId: varchar({ length: 36 }).notNull(),
    currency: varchar({ length: 8 }).notNull(),
    amount: decimal({ precision: 12, scale: 2 }).notNull(),
    regionId: varchar({ length: 36 }),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("commercial_prices_plan_idx").on(t.planId),
    index("commercial_prices_region_idx").on(t.regionId),
  ]
);

export const commercialPromotions = mysqlTable(
  "commercial_promotions",
  {
    id: varchar({ length: 36 }).primaryKey(),
    code: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    effectSummary: text().notNull(),
    eligiblePlanIds: json().$type<string[]>().notNull(),
    startsAt: timestamp({ mode: "string" }),
    endsAt: timestamp({ mode: "string" }),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("commercial_promotions_code_uq").on(t.code)]
);

export type InsertCommercialPlan = typeof commercialPlans.$inferInsert;
export type SelectCommercialPlan = typeof commercialPlans.$inferSelect;

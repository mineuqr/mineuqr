/**
 * COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1
 * Immutable Charged Terms snapshots. Insert-only. Binding remains 1:1 enrollment leftover.
 */
import {
  decimal,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

export const commercialSubscriptionChargedTerms = mysqlTable(
  "commercial_subscription_charged_terms",
  {
    id: varchar({ length: 36 }).primaryKey(),
    subscriptionId: int().notNull(),
    planId: varchar({ length: 36 }).notNull(),
    chargedAmount: decimal({ precision: 12, scale: 2 }).notNull(),
    chargedCurrency: varchar({ length: 8 }).notNull(),
    billingCycleId: varchar({ length: 36 }),
    billingCycleCode: varchar({ length: 64 }).notNull(),
    effectiveFrom: timestamp({ mode: "string" }).notNull(),
    version: int().notNull(),
    source: varchar({ length: 32 }).notNull(),
    actorId: int(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("commercial_charged_terms_sub_version_uq").on(
      t.subscriptionId,
      t.version
    ),
    index("commercial_charged_terms_sub_effective_idx").on(
      t.subscriptionId,
      t.effectiveFrom
    ),
  ]
);

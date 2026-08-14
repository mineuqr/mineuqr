/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Catalog-owned subscription → live plan bindings.
 * Charged terms are immutable for the current period; invoices remain the financial SSOT.
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

export const commercialSubscriptionBindings = mysqlTable(
  "commercial_subscription_bindings",
  {
    id: varchar({ length: 36 }).primaryKey(),
    subscriptionId: int().notNull(),
    planId: varchar({ length: 36 }).notNull(),
    chargedAmount: decimal({ precision: 12, scale: 2 }),
    chargedCurrency: varchar({ length: 8 }),
    billingCycleId: varchar({ length: 36 }),
    billingCycleCode: varchar({ length: 64 }),
    legacyPlanId: int(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    uniqueIndex("commercial_subscription_bindings_sub_uq").on(t.subscriptionId),
    index("commercial_subscription_bindings_plan_idx").on(t.planId),
  ]
);

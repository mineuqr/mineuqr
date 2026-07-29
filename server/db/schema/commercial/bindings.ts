/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * Catalog-owned subscription → snapshot bindings (no mutation of legacy plan config).
 */

import {
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
    planVersionId: varchar({ length: 36 }).notNull(),
    snapshotId: varchar({ length: 36 }).notNull(),
    legacyPlanId: int(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("commercial_subscription_bindings_sub_uq").on(t.subscriptionId),
    index("commercial_subscription_bindings_version_idx").on(t.planVersionId),
    index("commercial_subscription_bindings_snapshot_idx").on(t.snapshotId),
  ]
);

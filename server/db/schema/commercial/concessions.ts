/**
 * COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1
 * Insert-oriented commercial concession versions. Current = active and now < endsAt.
 */
import {
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

export const commercialSubscriptionConcessions = mysqlTable(
  "commercial_subscription_concessions",
  {
    id: varchar({ length: 36 }).primaryKey(),
    subscriptionId: int().notNull(),
    planId: varchar({ length: 36 }).notNull(),
    billingCycleCode: varchar({ length: 64 }).notNull(),
    unit: varchar({ length: 16 }).notNull(),
    duration: int().notNull(),
    startsAt: timestamp({ mode: "string" }).notNull(),
    endsAt: timestamp({ mode: "string" }).notNull(),
    status: varchar({ length: 16 }).notNull(),
    version: int().notNull(),
    source: varchar({ length: 32 }).notNull(),
    actorId: int(),
    reason: varchar({ length: 512 }).notNull(),
    supersededBy: varchar({ length: 36 }),
    cancelledAt: timestamp({ mode: "string" }),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("commercial_concessions_sub_version_uq").on(
      t.subscriptionId,
      t.version
    ),
    index("commercial_concessions_sub_status_ends_idx").on(
      t.subscriptionId,
      t.status,
      t.endsAt
    ),
  ]
);

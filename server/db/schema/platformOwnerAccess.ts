/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Dedicated persistence for Platform Owner Access Mode.
 * Not a subscription, binding, or billing record.
 */

import { mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const PLATFORM_OWNER_ACCESS_MODES = ["FULL_PLATFORM", "SIMULATED_PLAN"] as const;

export type PlatformOwnerAccessMode = (typeof PLATFORM_OWNER_ACCESS_MODES)[number];

export const platformOwnerAccessMode = mysqlTable("platform_owner_access_mode", {
  ownerOpenId: varchar({ length: 64 }).primaryKey(),
  mode: mysqlEnum(["FULL_PLATFORM", "SIMULATED_PLAN"]).notNull(),
  simulatedPlanCode: varchar({ length: 64 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
});

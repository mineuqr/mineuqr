/**
 * COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1
 * G-08 helpers. Mutates only synthetic G-08 owners on mineuqr-stagIn.
 */
import { eq, sql } from "drizzle-orm";
import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import type { Pool } from "mysql2";
import {
  categories,
  menuItems,
  restaurants,
} from "../../../drizzle/schema";
import {
  withCommercialLimitOccupancy,
  type CommercialOccupancyTx,
} from "../commercialLimitOccupancy";
import {
  requireRestaurantRowForUpdate,
  lockRestaurantRowForUpdate,
} from "../../db/restaurantRowLock";
import type { OccupancyTestTidb } from "./occupancyTestTidb";

export const G08_OWNER_A = 980801801;
export const G08_OWNER_B = 980801802;
export const G08_OWNER_C = 980801803;
export const G08_OWNERS = [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C] as const;
export const G08_SLUG_PREFIX = "g08-domain-race-";

export const occupancyG08Caps = mysqlTable("occupancy_g08_caps", {
  scopeKind: varchar({ length: 16 }).notNull(),
  scopeId: int().notNull(),
  limitKey: varchar({ length: 128 }).notNull(),
  cap: int().notNull(),
});

export const occupancyG08Idempotency = mysqlTable("occupancy_g08_idempotency", {
  id: int().autoincrement().primaryKey(),
  scopeId: int().notNull(),
  idemKey: varchar({ length: 64 }).notNull(),
  fingerprint: varchar({ length: 64 }).notNull(),
  resourceId: int().notNull(),
});

export const occupancyG08Owners = mysqlTable("occupancy_g08_owners", {
  id: int().autoincrement().primaryKey(),
  email: varchar({ length: 190 }).notNull(),
});

export const occupancyG07Terminals = mysqlTable("occupancy_g07_terminals", {
  id: int().autoincrement().primaryKey(),
  scopeId: int().notNull(),
  provisioned: int().notNull(),
  replacedById: int(),
});

export type OccupancyDb = OccupancyTestTidb["db"];

export function capDecision(
  cap: number,
  limitKey: "restaurants" | "categories" | "items" | "posTerminals"
) {
  return async (proposedTotal: number) => ({
    allowed: proposedTotal <= cap,
    reasonCode: proposedTotal <= cap ? "within_limit" : "limit_exceeded",
    limitKey,
    cap,
    proposedTotal,
    policy: "hard" as const,
    source: "g08-tidb",
  });
}

export async function ensureG08FixtureTables(pool: Pool): Promise<void> {
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_g08_caps (
      scopeKind varchar(16) NOT NULL,
      scopeId int NOT NULL,
      limitKey varchar(128) NOT NULL,
      cap int NOT NULL,
      PRIMARY KEY (scopeKind, scopeId, limitKey)
    )
  `);
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_g08_idempotency (
      id int NOT NULL AUTO_INCREMENT,
      scopeId int NOT NULL,
      idemKey varchar(64) NOT NULL,
      fingerprint varchar(64) NOT NULL,
      resourceId int NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY occupancy_g08_idempotency_unique (scopeId, idemKey)
    )
  `);
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_g08_owners (
      id int NOT NULL AUTO_INCREMENT,
      email varchar(190) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY occupancy_g08_owners_email (email)
    )
  `);
}

export async function cleanupG08Domain(pool: Pool): Promise<void> {
  const [rows] = await pool.promise().query(
    `SELECT id FROM restaurants
     WHERE userId IN (?, ?, ?) AND slug LIKE ?`,
    [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C, `${G08_SLUG_PREFIX}%`]
  );
  const ids = (rows as { id: number }[]).map((row) => Number(row.id));
  await pool.promise().query("DELETE FROM menu_items WHERE nameAr LIKE ?", [
    "G08-item%",
  ]);
  await pool.promise().query("DELETE FROM categories WHERE nameAr LIKE ?", [
    "G08-cat%",
  ]);
  if (ids.length > 0) {
    await pool.promise().query(
      `DELETE FROM restaurants WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids
    );
  }
  await pool.promise().query("DELETE FROM restaurants WHERE slug LIKE ?", [
    `${G08_SLUG_PREFIX}%`,
  ]);
  await pool.promise().query(
    "DELETE FROM occupancy_g07_terminals WHERE scopeId IN (?, ?, ?)",
    [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C]
  );
  await pool.promise().query(
    "DELETE FROM occupancy_g08_caps WHERE scopeId IN (?, ?, ?)",
    [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C]
  );
  await pool.promise().query(
    "DELETE FROM occupancy_g08_idempotency WHERE scopeId IN (?, ?, ?)",
    [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C]
  );
  await pool.promise().query(
    "DELETE FROM occupancy_g08_owners WHERE email LIKE ?",
    ["g08-domain-race-%"]
  );
}

export async function countRestaurants(
  pool: Pool,
  ownerUserId: number
): Promise<number> {
  const [rows] = await pool.promise().query(
    "SELECT COUNT(*) AS c FROM restaurants WHERE userId = ?",
    [ownerUserId]
  );
  return Number((rows as { c: number }[])[0]?.c ?? 0);
}

export async function countCategories(
  pool: Pool,
  restaurantId: number
): Promise<number> {
  const [rows] = await pool.promise().query(
    "SELECT COUNT(*) AS c FROM categories WHERE restaurantId = ?",
    [restaurantId]
  );
  return Number((rows as { c: number }[])[0]?.c ?? 0);
}

export async function countItems(
  pool: Pool,
  restaurantId: number
): Promise<number> {
  const [rows] = await pool.promise().query(
    "SELECT COUNT(*) AS c FROM menu_items WHERE restaurantId = ?",
    [restaurantId]
  );
  return Number((rows as { c: number }[])[0]?.c ?? 0);
}

export async function countProvisionedTerminals(
  pool: Pool,
  scopeId: number
): Promise<number> {
  const [rows] = await pool.promise().query(
    "SELECT COUNT(*) AS c FROM occupancy_g07_terminals WHERE scopeId = ? AND provisioned = 1",
    [scopeId]
  );
  return Number((rows as { c: number }[])[0]?.c ?? 0);
}

async function insertId(
  exec: NonNullable<CommercialOccupancyTx> | OccupancyDb,
  statement: ReturnType<typeof sql>
): Promise<number> {
  const result = await exec.execute(statement);
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number }).insertId ?? 0);
  if (!id) {
    const [rows] = await exec.execute(sql`SELECT LAST_INSERT_ID() AS id`);
    const list = rows as unknown as { id: number }[];
    return Number(list[0]?.id ?? 0);
  }
  return id;
}

function slug(): string {
  return `${G08_SLUG_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function insertRestaurantRow(
  exec: NonNullable<CommercialOccupancyTx> | OccupancyDb,
  ownerUserId: number,
  nameAr = "G08",
  restaurantSlug?: string
): Promise<number> {
  return insertId(
    exec,
    sql`INSERT INTO restaurants (userId, slug, nameAr) VALUES (${ownerUserId}, ${restaurantSlug ?? slug()}, ${nameAr})`
  );
}

export async function createRestaurantLocked(input: {
  db: OccupancyDb;
  ownerUserId: number;
  cap: number;
  delayMs?: number;
}): Promise<{ id: number }> {
  return withCommercialLimitOccupancy({
    db: input.db,
    scope: {
      kind: "owner",
      scopeId: input.ownerUserId,
      ownerUserId: input.ownerUserId,
    },
    limitKey: "restaurants",
    occupancyDelta: 1,
    decide: capDecision(input.cap, "restaurants"),
    countOccupancy: async (tx) => {
      const exec = tx ?? input.db;
      const [row] = await exec
        .select({ count: sql<number>`count(*)` })
        .from(restaurants)
        .where(eq(restaurants.userId, input.ownerUserId));
      return Number(row?.count ?? 0);
    },
    create: async (tx) => {
      const exec = tx ?? input.db;
      if (input.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, input.delayMs));
      }
      const id = await insertRestaurantRow(exec, input.ownerUserId);
      return { id };
    },
  });
}

export async function createCategoryLocked(input: {
  db: OccupancyDb;
  restaurantId: number;
  ownerUserId: number;
  cap: number;
  delayMs?: number;
}): Promise<{ id: number }> {
  return withCommercialLimitOccupancy({
    db: input.db,
    scope: {
      kind: "restaurant",
      scopeId: input.restaurantId,
      ownerUserId: input.ownerUserId,
    },
    limitKey: "categories",
    occupancyDelta: 1,
    decide: capDecision(input.cap, "categories"),
    countOccupancy: async (tx) => {
      if (tx) await requireRestaurantRowForUpdate(tx, input.restaurantId);
      const exec = tx ?? input.db;
      const [row] = await exec
        .select({ count: sql<number>`count(*)` })
        .from(categories)
        .where(eq(categories.restaurantId, input.restaurantId));
      return Number(row?.count ?? 0);
    },
    create: async (tx) => {
      const exec = tx ?? input.db;
      if (input.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, input.delayMs));
      }
      const id = await insertId(
        exec,
        sql`INSERT INTO categories (restaurantId, nameAr) VALUES (${input.restaurantId}, ${"G08-cat"})`
      );
      return { id };
    },
  });
}

export async function createItemLocked(input: {
  db: OccupancyDb;
  restaurantId: number;
  categoryId: number;
  ownerUserId: number;
  cap: number;
  delayMs?: number;
}): Promise<{ id: number }> {
  return withCommercialLimitOccupancy({
    db: input.db,
    scope: {
      kind: "restaurant",
      scopeId: input.restaurantId,
      ownerUserId: input.ownerUserId,
    },
    limitKey: "items",
    occupancyDelta: 1,
    decide: capDecision(input.cap, "items"),
    countOccupancy: async (tx) => {
      if (tx) await requireRestaurantRowForUpdate(tx, input.restaurantId);
      const exec = tx ?? input.db;
      const [row] = await exec
        .select({ count: sql<number>`count(*)` })
        .from(menuItems)
        .where(eq(menuItems.restaurantId, input.restaurantId));
      return Number(row?.count ?? 0);
    },
    create: async (tx) => {
      const exec = tx ?? input.db;
      if (input.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, input.delayMs));
      }
      const id = await insertId(
        exec,
        sql`INSERT INTO menu_items (restaurantId, categoryId, nameAr, price) VALUES (${input.restaurantId}, ${input.categoryId}, ${"G08-item"}, ${"1.00"})`
      );
      return { id };
    },
  });
}

export async function provisionTerminalLocked(input: {
  db: OccupancyDb;
  scopeId: number;
  cap: number;
  occupancyDelta?: 0 | 1;
  delayMs?: number;
  lockRestaurantId?: number;
  resolveExisting?: (
    tx: CommercialOccupancyTx | null
  ) => Promise<{ id: number } | null>;
  create?: (
    tx: CommercialOccupancyTx | null
  ) => Promise<{ id: number; replacementId?: number }>;
}): Promise<{ id: number; replacementId?: number }> {
  return withCommercialLimitOccupancy({
    db: input.db,
    scope: {
      kind: "restaurant",
      scopeId: input.scopeId,
      ownerUserId: input.scopeId,
    },
    limitKey: "posTerminals",
    occupancyDelta: input.occupancyDelta ?? 1,
    decide: capDecision(input.cap, "posTerminals"),
    resolveExisting: input.resolveExisting,
    countOccupancy: async (tx) => {
      if (tx && input.lockRestaurantId) {
        await requireRestaurantRowForUpdate(tx, input.lockRestaurantId);
      }
      const exec = tx ?? input.db;
      const [row] = await exec
        .select({ count: sql<number>`count(*)` })
        .from(occupancyG07Terminals)
        .where(
          sql`${occupancyG07Terminals.scopeId} = ${input.scopeId} AND ${occupancyG07Terminals.provisioned} = 1`
        );
      return Number(row?.count ?? 0);
    },
    create:
      input.create ??
      (async (tx) => {
        const exec = tx ?? input.db;
        if (input.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, input.delayMs));
        }
        const result = await exec.insert(occupancyG07Terminals).values({
          scopeId: input.scopeId,
          provisioned: 1,
        });
        return { id: result[0].insertId };
      }),
  });
}

export function settledMeta(results: PromiseSettledResult<unknown>[]): {
  fulfilled: number;
  rejected: number;
  exceeded: number;
  otherRejected: number;
} {
  const fulfilled = results.filter((row) => row.status === "fulfilled").length;
  const rejected = results.filter((row) => row.status === "rejected");
  const exceeded = rejected.filter(
    (row) =>
      row.status === "rejected" &&
      row.reason &&
      typeof row.reason === "object" &&
      (row.reason as { code?: string }).code === "COMMERCIAL_LIMIT_EXCEEDED"
  ).length;
  return {
    fulfilled,
    rejected: rejected.length,
    exceeded,
    otherRejected: rejected.length - exceeded,
  };
}

export async function deleteRestaurantLockedCascade(
  db: OccupancyDb,
  restaurantId: number
): Promise<void> {
  await db.transaction(
    async (tx) => {
      await lockRestaurantRowForUpdate(tx, restaurantId);
      await tx.execute(
        sql`DELETE FROM menu_items WHERE restaurantId = ${restaurantId}`
      );
      await tx.execute(
        sql`DELETE FROM categories WHERE restaurantId = ${restaurantId}`
      );
      await tx.execute(
        sql`DELETE FROM occupancy_g07_terminals WHERE scopeId = ${restaurantId}`
      );
      await tx.execute(sql`DELETE FROM restaurants WHERE id = ${restaurantId}`);
    },
    { isolationLevel: "read committed" }
  );
}

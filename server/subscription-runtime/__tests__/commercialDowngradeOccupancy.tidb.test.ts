/**
 * COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1
 * Real TiDB: existing occupancy may exceed a new cap; new capacity may not.
 * G07_DATABASE_URL / mineuqr-stagIn only.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { restaurants } from "../../../drizzle/schema";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
  withCommercialLimitOccupancy,
} from "../commercialLimitOccupancy";
import { throwCommercialOccupancyTrpcError } from "../commercialOccupancyTrpc";
import {
  readG07DatabaseUrl,
  startOccupancyTestTidb,
  type OccupancyTestTidb,
} from "./occupancyTestTidb";
import {
  capDecision,
  createCategoryLocked,
  createItemLocked,
  createRestaurantLocked,
  ensureG08FixtureTables,
  insertRestaurantRow,
  occupancyG07Terminals,
  provisionTerminalLocked,
} from "./occupancyG08Tidb";
import { TRPCError } from "@trpc/server";

const G11_OWNER_A = 983001001;
const G11_OWNER_B = 983001002;

const supplied = readG07DatabaseUrl();
if (process.env.G07_REQUIRE_TIDB === "1" && !supplied) {
  throw new Error(
    "G-11 STOP: G07_REQUIRE_TIDB=1 but G07_DATABASE_URL / TIDB_TEST_DATABASE_URL is missing"
  );
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 120000 });

describe.skipIf(!supplied)("G-11 downgrade occupancy TiDB policy", () => {
  let tidb: OccupancyTestTidb;
  const evidence: Record<string, unknown> = {};

  beforeAll(async () => {
    tidb = await startOccupancyTestTidb();
    await ensureG08FixtureTables(tidb.pool);
    await cleanupG11();
    evidence.identity = tidb.identity;
    evidence.engine = tidb.engine;
    evidence.census = await census();
  }, 120000);

  afterAll(async () => {
    if (tidb) {
      await cleanupG11();
      await tidb.stop();
    }
    // eslint-disable-next-line no-console
    console.log("G11_EVIDENCE " + JSON.stringify(evidence));
  });

  async function tableExists(table: string): Promise<boolean> {
    const [rows] = await tidb.pool.promise().query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    return (rows as unknown[]).length > 0;
  }

  async function columnExists(table: string, column: string): Promise<boolean> {
    const [rows] = await tidb.pool.promise().query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return (rows as unknown[]).length > 0;
  }

  async function countSql(query: string): Promise<number> {
    const [rows] = await tidb.pool.promise().query(query);
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function census() {
    return {
      restaurantsTotal: await countSql("SELECT COUNT(*) AS c FROM restaurants"),
      restaurantsInactive: (await columnExists("restaurants", "isActive"))
        ? await countSql("SELECT COUNT(*) AS c FROM restaurants WHERE isActive = 0")
        : null,
      categoriesTotal: await countSql("SELECT COUNT(*) AS c FROM categories"),
      categoriesInactive: (await columnExists("categories", "isActive"))
        ? await countSql("SELECT COUNT(*) AS c FROM categories WHERE isActive = 0")
        : null,
      itemsTotal: await countSql("SELECT COUNT(*) AS c FROM menu_items"),
      itemsUnavailable: (await columnExists("menu_items", "isAvailable"))
        ? await countSql(
            "SELECT COUNT(*) AS c FROM menu_items WHERE isAvailable = 0"
          )
        : null,
      posTerminalsPresent: await tableExists("pos_terminals"),
      subscriptionsPresent: await tableExists("subscriptions"),
      bindingsPresent: await tableExists("commercial_subscription_bindings"),
    };
  }

  async function cleanupG11(): Promise<void> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE userId IN (?, ?)",
      [G11_OWNER_A, G11_OWNER_B]
    );
    const ids = (rows as { id: number }[]).map((row) => Number(row.id));
    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      await tidb.pool.promise().query(
        `DELETE FROM menu_items WHERE restaurantId IN (${placeholders})`,
        ids
      );
      await tidb.pool.promise().query(
        `DELETE FROM categories WHERE restaurantId IN (${placeholders})`,
        ids
      );
      await tidb.pool.promise().query(
        `DELETE FROM restaurants WHERE id IN (${placeholders})`,
        ids
      );
    }
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_terminals WHERE scopeId IN (?, ?)",
      [G11_OWNER_A, G11_OWNER_B]
    );
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g08_caps WHERE scopeId IN (?, ?)",
      [G11_OWNER_A, G11_OWNER_B]
    );
  }

  async function restaurantCount(ownerUserId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM restaurants WHERE userId = ?",
      [ownerUserId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function categoryCount(restaurantId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM categories WHERE restaurantId = ?",
      [restaurantId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function itemCount(restaurantId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM menu_items WHERE restaurantId = ?",
      [restaurantId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function provisionedCount(scopeId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_g07_terminals WHERE scopeId = ? AND provisioned = 1",
      [scopeId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  it("records non-production TiDB identity", () => {
    expect(tidb.identity.verdict).toBe("ACCEPT_NON_PRODUCTION");
    expect(tidb.identity.sameSqlUserAsProductionMain).toBe(false);
    expect(tidb.engine.version).toMatch(/tidb/i);
  });

  it("existing restaurants remain after downgrade; new create is rejected", async () => {
    await cleanupG11();
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    expect(await restaurantCount(G11_OWNER_A)).toBe(2);
    await expect(
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await restaurantCount(G11_OWNER_A)).toBe(2);
    evidence.createAfterDowngrade = { occupancy: 2, newCap: 1, create: "rejected" };
  });

  it("existing restaurant can be edited and deleted after downgrade", async () => {
    await cleanupG11();
    const first = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    const second = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await tidb.pool.promise().query(
      "UPDATE restaurants SET nameAr = ? WHERE id = ?",
      ["G11-edited", first.id]
    );
    const [edited] = await tidb.pool.promise().query(
      "SELECT nameAr FROM restaurants WHERE id = ?",
      [first.id]
    );
    expect((edited as { nameAr: string }[])[0]?.nameAr).toBe("G11-edited");
    await expect(
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    await tidb.pool.promise().query("DELETE FROM restaurants WHERE id = ?", [
      second.id,
    ]);
    expect(await restaurantCount(G11_OWNER_A)).toBe(1);
    await expect(
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    await tidb.pool.promise().query("DELETE FROM restaurants WHERE id = ?", [
      first.id,
    ]);
    expect(await restaurantCount(G11_OWNER_A)).toBe(0);
    const created = await createRestaurantLocked({
      db: tidb.dbB,
      ownerUserId: G11_OWNER_A,
      cap: 1,
    });
    expect(created.id).toBeGreaterThan(0);
    expect(await restaurantCount(G11_OWNER_A)).toBe(1);
    evidence.deleteAfterDowngrade = {
      createAtOccupancy1Cap1: "rejected",
      createAtOccupancy0Cap1: "allowed",
    };
  });

  it("hiding a category after downgrade does not release occupancy", async () => {
    await cleanupG11();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 5,
    });
    const a = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 0 WHERE id = ?",
      [a.id]
    );
    await expect(
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await categoryCount(restaurant.id)).toBe(2);
    evidence.inactiveAfterDowngrade = { occupancy: 2, newCap: 1 };
  });

  it("catalog reactivation after downgrade does not consume a new slot", async () => {
    await cleanupG11();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 0 WHERE id = ?",
      [category.id]
    );
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 1 WHERE id = ?",
      [category.id]
    );
    expect(await categoryCount(restaurant.id)).toBe(2);
    await expect(
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    evidence.catalogReactivate = { occupancy: 2 };
  });

  it("item create after item-cap downgrade is rejected independently of restaurants", async () => {
    await cleanupG11();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 5,
    });
    await createItemLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      categoryId: category.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await createItemLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      categoryId: category.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await expect(
      createItemLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        categoryId: category.id,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await itemCount(restaurant.id)).toBe(2);
    expect(await restaurantCount(G11_OWNER_A)).toBe(1);
    evidence.multiResource = {
      restaurants: 1,
      items: 2,
      itemCreateAfterDowngrade: "rejected",
    };
  });

  it("upgrade after downgrade permits create immediately when the new cap allows", async () => {
    await cleanupG11();
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await expect(
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    const upgraded = await createRestaurantLocked({
      db: tidb.dbB,
      ownerUserId: G11_OWNER_A,
      cap: 3,
    });
    expect(upgraded.id).toBeGreaterThan(0);
    expect(await restaurantCount(G11_OWNER_A)).toBe(3);
    evidence.upgradeAfterDowngrade = { occupancy: 3, cap: 3 };
  });

  it("owner-equivalent and admin-equivalent creates share the downgraded cap", async () => {
    await cleanupG11();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    const raced = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      }),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G11_OWNER_A,
        cap: 1,
      }),
    ]);
    const rejected = raced.filter((row) => row.status === "rejected").length;
    expect(rejected).toBe(2);
    expect(await categoryCount(restaurant.id)).toBe(2);
    evidence.ownerAdmin = { occupancy: 2, rejected };
  });

  it("POS existing terminals remain; new provision is rejected; deactivate releases", async () => {
    await cleanupG11();
    const first = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G11_OWNER_A,
      cap: 2,
    });
    await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G11_OWNER_A,
      cap: 2,
    });
    await expect(
      provisionTerminalLocked({
        db: tidb.dbB,
        scopeId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await provisionedCount(G11_OWNER_A)).toBe(2);
    await tidb.pool.promise().query(
      "UPDATE occupancy_g07_terminals SET provisioned = 0 WHERE id = ?",
      [first.id]
    );
    expect(await provisionedCount(G11_OWNER_A)).toBe(1);
    await expect(
      provisionTerminalLocked({
        db: tidb.dbB,
        scopeId: G11_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    evidence.posDowngrade = {
      afterCreateReject: 2,
      afterDeactivate: 1,
      reactivateAtCap: "rejected",
    };
  });

  it("POS replace occupancyDelta 0 remains allowed when occupancy exceeds the new cap", async () => {
    await cleanupG11();
    const first = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G11_OWNER_A,
      cap: 2,
    });
    await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G11_OWNER_A,
      cap: 2,
    });
    const replaced = await provisionTerminalLocked({
      db: tidb.dbB,
      scopeId: G11_OWNER_A,
      cap: 1,
      occupancyDelta: 0,
      create: async (tx) => {
        const exec = tx ?? tidb.dbB;
        await exec
          .update(occupancyG07Terminals)
          .set({ provisioned: 0 })
          .where(eq(occupancyG07Terminals.id, first.id));
        const result = await exec.insert(occupancyG07Terminals).values({
          scopeId: G11_OWNER_A,
          provisioned: 1,
          replacedById: first.id,
        });
        return { id: result[0].insertId, replacementId: result[0].insertId };
      },
    });
    expect(replaced.id).toBeGreaterThan(0);
    expect(await provisionedCount(G11_OWNER_A)).toBe(2);
    evidence.posReplaceOverCap = { occupancy: 2, newCap: 1, replace: "allowed" };
  });

  it("tenant B downgrade does not change tenant A occupancy", async () => {
    await cleanupG11();
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_A,
      cap: 1,
    });
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_B,
      cap: 2,
    });
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G11_OWNER_B,
      cap: 2,
    });
    await expect(
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G11_OWNER_B,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    const extraA = await createRestaurantLocked({
      db: tidb.dbB,
      ownerUserId: G11_OWNER_A,
      cap: 2,
    });
    expect(extraA.id).toBeGreaterThan(0);
    expect(await restaurantCount(G11_OWNER_A)).toBe(2);
    expect(await restaurantCount(G11_OWNER_B)).toBe(2);
    evidence.crossTenant = { a: 2, b: 2 };
  });

  it("downgrade-then-create rejects; create-then-downgrade may leave occupancy > new cap", async () => {
    await cleanupG11();
    await tidb.pool.promise().query(
      "INSERT INTO occupancy_g08_caps (scopeKind, scopeId, limitKey, cap) VALUES (?, ?, ?, ?)",
      ["owner", G11_OWNER_A, "restaurants", 2]
    );
    const createWithLiveCap = (db: typeof tidb.db, delayMs: number) =>
      withCommercialLimitOccupancy({
        db,
        scope: {
          kind: "owner",
          scopeId: G11_OWNER_A,
          ownerUserId: G11_OWNER_A,
        },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: async (proposedTotal) => {
          const [rows] = await tidb.pool.promise().query(
            "SELECT cap FROM occupancy_g08_caps WHERE scopeId = ? AND limitKey = ?",
            [G11_OWNER_A, "restaurants"]
          );
          const cap = Number((rows as { cap: number }[])[0]?.cap ?? 0);
          return capDecision(cap, "restaurants")(proposedTotal);
        },
        countOccupancy: async (tx) => {
          const exec = tx ?? db;
          const [row] = await exec
            .select({ count: sql<number>`count(*)` })
            .from(restaurants)
            .where(eq(restaurants.userId, G11_OWNER_A));
          return Number(row?.count ?? 0);
        },
        create: async (tx) => {
          const exec = tx ?? db;
          if (delayMs) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          const id = await insertRestaurantRow(exec, G11_OWNER_A, "G11-plan");
          return { id };
        },
      });

    await createWithLiveCap(tidb.db, 0);
    await tidb.pool.promise().query(
      "UPDATE occupancy_g08_caps SET cap = 1 WHERE scopeId = ? AND limitKey = ?",
      [G11_OWNER_A, "restaurants"]
    );
    await expect(createWithLiveCap(tidb.dbB, 0)).rejects.toBeInstanceOf(
      CommercialLimitExceededError
    );
    expect(await restaurantCount(G11_OWNER_A)).toBe(1);

    await tidb.pool.promise().query(
      "UPDATE occupancy_g08_caps SET cap = 2 WHERE scopeId = ? AND limitKey = ?",
      [G11_OWNER_A, "restaurants"]
    );
    const createdThenDowngraded = await createWithLiveCap(tidb.db, 0);
    expect(createdThenDowngraded.id).toBeGreaterThan(0);
    await tidb.pool.promise().query(
      "UPDATE occupancy_g08_caps SET cap = 1 WHERE scopeId = ? AND limitKey = ?",
      [G11_OWNER_A, "restaurants"]
    );
    expect(await restaurantCount(G11_OWNER_A)).toBe(2);
    await expect(createWithLiveCap(tidb.dbB, 0)).rejects.toBeInstanceOf(
      CommercialLimitExceededError
    );
    evidence.sequentialPlanChange = {
      downgradeThenCreate: "rejected",
      createThenDowngradeOccupancy: 2,
      newCap: 1,
    };
  });

  it("overlapping downgrade ∥ create never exceeds the old cap", async () => {
    await cleanupG11();
    await tidb.pool.promise().query(
      "INSERT INTO occupancy_g08_caps (scopeKind, scopeId, limitKey, cap) VALUES (?, ?, ?, ?)",
      ["owner", G11_OWNER_A, "restaurants", 2]
    );
    const createWithLiveCap = (db: typeof tidb.db, delayMs: number) =>
      withCommercialLimitOccupancy({
        db,
        scope: {
          kind: "owner",
          scopeId: G11_OWNER_A,
          ownerUserId: G11_OWNER_A,
        },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: async (proposedTotal) => {
          const [rows] = await tidb.pool.promise().query(
            "SELECT cap FROM occupancy_g08_caps WHERE scopeId = ? AND limitKey = ?",
            [G11_OWNER_A, "restaurants"]
          );
          const cap = Number((rows as { cap: number }[])[0]?.cap ?? 0);
          return capDecision(cap, "restaurants")(proposedTotal);
        },
        countOccupancy: async (tx) => {
          const exec = tx ?? db;
          const [row] = await exec
            .select({ count: sql<number>`count(*)` })
            .from(restaurants)
            .where(eq(restaurants.userId, G11_OWNER_A));
          return Number(row?.count ?? 0);
        },
        create: async (tx) => {
          const exec = tx ?? db;
          if (delayMs) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          const id = await insertRestaurantRow(exec, G11_OWNER_A, "G11-race");
          return { id };
        },
      });
    await createWithLiveCap(tidb.db, 0);
    const raced = await Promise.allSettled([
      createWithLiveCap(tidb.db, 400),
      tidb.poolB.promise().query(
        "UPDATE occupancy_g08_caps SET cap = 1 WHERE scopeId = ? AND limitKey = ?",
        [G11_OWNER_A, "restaurants"]
      ),
    ]);
    const occ = await restaurantCount(G11_OWNER_A);
    const [capRows] = await tidb.pool.promise().query(
      "SELECT cap FROM occupancy_g08_caps WHERE scopeId = ? AND limitKey = ?",
      [G11_OWNER_A, "restaurants"]
    );
    const newCap = Number((capRows as { cap: number }[])[0]?.cap ?? 0);
    expect(occ).toBeLessThanOrEqual(2);
    expect(newCap).toBe(1);
    evidence.concurrentPlanChange = {
      occupancy: occ,
      newCap,
      occupancyMayExceedNewCap: occ > newCap,
      create: raced[0]?.status,
    };
  });

  it("failure after a permitted create rolls back and does not consume a slot", async () => {
    await cleanupG11();
    await expect(
      withCommercialLimitOccupancy({
        db: tidb.db,
        scope: {
          kind: "owner",
          scopeId: G11_OWNER_A,
          ownerUserId: G11_OWNER_A,
        },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: capDecision(1, "restaurants"),
        countOccupancy: async () => 0,
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          await insertRestaurantRow(exec, G11_OWNER_A, "G11-fail");
          throw new Error("g11_injected_failure");
        },
      })
    ).rejects.toThrow("g11_injected_failure");
    expect(await restaurantCount(G11_OWNER_A)).toBe(0);
    evidence.failureInjection = { occupancy: 0 };
  });

  it("G-06 maps downgrade create denial to FORBIDDEN, not unauthorized", () => {
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialLimitExceededError("limit_exceeded", 3),
        (cap) => `cap ${cap}`
      );
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
      expect((error as TRPCError).message).not.toMatch(/unauthorized/i);
    }
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialOccupancyUnavailableError(),
        () => "unused"
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
    evidence.errorSemantics = {
      exceeded: "FORBIDDEN",
      unavailable: "INTERNAL_SERVER_ERROR",
    };
  });
});

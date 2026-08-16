/**
 * COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1
 * Real TiDB: inactive catalog rows still occupy; POS deactivated does not.
 * G07_DATABASE_URL / mineuqr-stagIn only.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CommercialLimitExceededError } from "../commercialLimitOccupancy";
import {
  readG07DatabaseUrl,
  startOccupancyTestTidb,
  type OccupancyTestTidb,
} from "./occupancyTestTidb";
import {
  createCategoryLocked,
  createItemLocked,
  createRestaurantLocked,
  ensureG08FixtureTables,
  provisionTerminalLocked,
} from "./occupancyG08Tidb";

const G10_OWNER_A = 982001001;
const G10_OWNER_B = 982001002;

const supplied = readG07DatabaseUrl();
if (process.env.G07_REQUIRE_TIDB === "1" && !supplied) {
  throw new Error(
    "G-10 STOP: G07_REQUIRE_TIDB=1 but G07_DATABASE_URL / TIDB_TEST_DATABASE_URL is missing"
  );
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 120000 });

describe.skipIf(!supplied)("G-10 inactive occupancy TiDB policy races", () => {
  let tidb: OccupancyTestTidb;
  const evidence: Record<string, unknown> = {};

  beforeAll(async () => {
    tidb = await startOccupancyTestTidb();
    await ensureG08FixtureTables(tidb.pool);
    await cleanupG10();
    evidence.identity = tidb.identity;
    evidence.engine = tidb.engine;
    evidence.census = await census();
  }, 120000);

  afterAll(async () => {
    if (tidb) {
      await cleanupG10();
      await tidb.stop();
    }
    // eslint-disable-next-line no-console
    console.log("G10_EVIDENCE " + JSON.stringify(evidence));
  });

  async function columnExists(table: string, column: string): Promise<boolean> {
    const [rows] = await tidb.pool.promise().query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return (rows as unknown[]).length > 0;
  }

  async function tableExists(table: string): Promise<boolean> {
    const [rows] = await tidb.pool.promise().query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    return (rows as unknown[]).length > 0;
  }

  async function census() {
    const hasRestActive = await columnExists("restaurants", "isActive");
    const hasCatActive = await columnExists("categories", "isActive");
    const hasItemAvail = await columnExists("menu_items", "isAvailable");
    const hasPos = await tableExists("pos_terminals");
    const count = async (sql: string) => {
      const [rows] = await tidb.pool.promise().query(sql);
      return Number((rows as { c: number }[])[0]?.c ?? 0);
    };
    return {
      restaurantsTotal: await count("SELECT COUNT(*) AS c FROM restaurants"),
      restaurantsInactive: hasRestActive
        ? await count("SELECT COUNT(*) AS c FROM restaurants WHERE isActive = 0")
        : null,
      categoriesTotal: await count("SELECT COUNT(*) AS c FROM categories"),
      categoriesInactive: hasCatActive
        ? await count("SELECT COUNT(*) AS c FROM categories WHERE isActive = 0")
        : null,
      itemsTotal: await count("SELECT COUNT(*) AS c FROM menu_items"),
      itemsUnavailable: hasItemAvail
        ? await count("SELECT COUNT(*) AS c FROM menu_items WHERE isAvailable = 0")
        : null,
      posTerminalsPresent: hasPos,
      columns: {
        restaurantsIsActive: hasRestActive,
        categoriesIsActive: hasCatActive,
        menuItemsIsAvailable: hasItemAvail,
      },
    };
  }

  async function cleanupG10(): Promise<void> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE userId IN (?, ?)",
      [G10_OWNER_A, G10_OWNER_B]
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
      [G10_OWNER_A, G10_OWNER_B]
    );
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

  async function restaurantCount(ownerUserId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM restaurants WHERE userId = ?",
      [ownerUserId]
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

  it("inactive category still occupies; create at cap is rejected", async () => {
    await cleanupG10();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G10_OWNER_A,
      cap: 1,
    });
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 0 WHERE id = ?",
      [category.id]
    );
    await expect(
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G10_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await categoryCount(restaurant.id)).toBe(1);
    evidence.inactiveCategoryOccupies = { occupancy: 1, cap: 1 };
  });

  it("reactivating an inactive category does not consume a slot", async () => {
    await cleanupG10();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G10_OWNER_A,
      cap: 1,
    });
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 0 WHERE id = ?",
      [category.id]
    );
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 1 WHERE id = ?",
      [category.id]
    );
    expect(await categoryCount(restaurant.id)).toBe(1);
    await expect(
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G10_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    evidence.reactivateCategory = { occupancy: 1 };
  });

  it("create ∥ deactivate at cap leaves occupancy = cap (inactive still counted)", async () => {
    await cleanupG10();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_A,
      cap: 5,
    });
    const existing = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G10_OWNER_A,
      cap: 1,
    });
    const raced = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G10_OWNER_A,
        cap: 1,
        delayMs: 300,
      }),
      tidb.poolB.promise().query(
        "UPDATE categories SET isActive = 0 WHERE id = ?",
        [existing.id]
      ),
    ]);
    const occ = await categoryCount(restaurant.id);
    expect(occ).toBe(1);
    expect(occ).toBeLessThanOrEqual(1);
    evidence.createVsDeactivate = { occupancy: occ, create: raced[0]?.status };
  });

  it("unavailable item still occupies; create at cap is rejected", async () => {
    await cleanupG10();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G10_OWNER_A,
      cap: 5,
    });
    const item = await createItemLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      categoryId: category.id,
      ownerUserId: G10_OWNER_A,
      cap: 1,
    });
    await tidb.pool.promise().query(
      "UPDATE menu_items SET isAvailable = 0 WHERE id = ?",
      [item.id]
    );
    await expect(
      createItemLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        categoryId: category.id,
        ownerUserId: G10_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await itemCount(restaurant.id)).toBe(1);
    evidence.unavailableItemOccupies = { occupancy: 1 };
  });

  it("inactive restaurant still occupies the restaurants cap", async () => {
    await cleanupG10();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_A,
      cap: 1,
    });
    await tidb.pool.promise().query(
      "UPDATE restaurants SET isActive = 0 WHERE id = ?",
      [restaurant.id]
    );
    await expect(
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G10_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await restaurantCount(G10_OWNER_A)).toBe(1);
    evidence.inactiveRestaurantOccupies = { occupancy: 1 };
  });

  it("POS deactivate releases the provisioned slot so another provision can succeed", async () => {
    await cleanupG10();
    const seed = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G10_OWNER_A,
      cap: 1,
    });
    await tidb.pool.promise().query(
      "UPDATE occupancy_g07_terminals SET provisioned = 0 WHERE id = ?",
      [seed.id]
    );
    const next = await provisionTerminalLocked({
      db: tidb.dbB,
      scopeId: G10_OWNER_A,
      cap: 1,
    });
    expect(next.id).toBeGreaterThan(0);
    expect(await provisionedCount(G10_OWNER_A)).toBe(1);
    evidence.posDeactivateReleases = { provisioned: 1 };
  });

  it("POS reactivate-equivalent provision at cap is rejected", async () => {
    await cleanupG10();
    await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G10_OWNER_A,
      cap: 1,
    });
    await expect(
      provisionTerminalLocked({
        db: tidb.dbB,
        scopeId: G10_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await provisionedCount(G10_OWNER_A)).toBe(1);
    evidence.posReactivateAtCap = { provisioned: 1 };
  });

  it("tenant B inactive flags do not affect tenant A occupancy", async () => {
    await cleanupG10();
    const a = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_A,
      cap: 5,
    });
    const b = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G10_OWNER_B,
      cap: 5,
    });
    const bCat = await createCategoryLocked({
      db: tidb.db,
      restaurantId: b.id,
      ownerUserId: G10_OWNER_B,
      cap: 1,
    });
    await tidb.pool.promise().query(
      "UPDATE categories SET isActive = 0 WHERE id = ?",
      [bCat.id]
    );
    await createCategoryLocked({
      db: tidb.dbB,
      restaurantId: a.id,
      ownerUserId: G10_OWNER_A,
      cap: 1,
    });
    expect(await categoryCount(a.id)).toBe(1);
    expect(await categoryCount(b.id)).toBe(1);
    evidence.crossTenant = { a: 1, b: 1 };
  });
});

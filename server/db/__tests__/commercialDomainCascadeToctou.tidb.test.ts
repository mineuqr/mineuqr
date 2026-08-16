/**
 * COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1
 * Real TiDB parent-delete vs child-create. G07_DATABASE_URL / mineuqr-stagIn only.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  lockRestaurantRowForUpdate,
  requireRestaurantRowForUpdate,
  RestaurantGoneError,
} from "../restaurantRowLock";
import {
  readG07DatabaseUrl,
  startOccupancyTestTidb,
  type OccupancyTestTidb,
} from "../../subscription-runtime/__tests__/occupancyTestTidb";
import {
  createCategoryLocked,
  createItemLocked,
  createRestaurantLocked,
  deleteRestaurantLockedCascade,
  ensureG08FixtureTables,
  provisionTerminalLocked,
} from "../../subscription-runtime/__tests__/occupancyG08Tidb";

const TOCTOU_OWNER_A = 980901901;
const TOCTOU_OWNER_B = 980901902;

const supplied = readG07DatabaseUrl();
if (process.env.G07_REQUIRE_TIDB === "1" && !supplied) {
  throw new Error(
    "TOCTOU STOP: G07_REQUIRE_TIDB=1 but G07_DATABASE_URL / TIDB_TEST_DATABASE_URL is missing"
  );
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 120000 });

describe.skipIf(!supplied)("restaurant cascade TOCTOU TiDB races", () => {
  let tidb: OccupancyTestTidb;
  const evidence: Record<string, unknown> = {};

  beforeAll(async () => {
    tidb = await startOccupancyTestTidb();
    await ensureG08FixtureTables(tidb.pool);
    await tidb.pool.promise().query(`
      CREATE TABLE IF NOT EXISTS occupancy_toctou_orders (
        id int NOT NULL AUTO_INCREMENT,
        restaurantId int NOT NULL,
        PRIMARY KEY (id),
        KEY occupancy_toctou_orders_restaurant (restaurantId)
      )
    `);
    await cleanupToctou();
    evidence.identity = tidb.identity;
    evidence.engine = tidb.engine;
  }, 120000);

  afterAll(async () => {
    if (tidb) {
      await cleanupToctou();
      await tidb.stop();
    }
    // eslint-disable-next-line no-console
    console.log("TOCTOU_EVIDENCE " + JSON.stringify(evidence));
  });

  async function cleanupToctou(): Promise<void> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE userId IN (?, ?)",
      [TOCTOU_OWNER_A, TOCTOU_OWNER_B]
    );
    const ids = (rows as { id: number }[]).map((row) => Number(row.id));
    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      await tidb.pool.promise().query(
        `DELETE FROM occupancy_toctou_orders WHERE restaurantId IN (${placeholders})`,
        ids
      );
      await tidb.pool.promise().query(
        `DELETE FROM menu_items WHERE restaurantId IN (${placeholders})`,
        ids
      );
      await tidb.pool.promise().query(
        `DELETE FROM categories WHERE restaurantId IN (${placeholders})`,
        ids
      );
      await tidb.pool.promise().query(
        `DELETE FROM occupancy_g07_terminals WHERE scopeId IN (${placeholders})`,
        ids
      );
      await tidb.pool.promise().query(
        `DELETE FROM restaurants WHERE id IN (${placeholders})`,
        ids
      );
    }
  }

  async function orphanCounts(restaurantId: number) {
    const [cats] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM categories WHERE restaurantId = ?",
      [restaurantId]
    );
    const [items] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM menu_items WHERE restaurantId = ?",
      [restaurantId]
    );
    const [terms] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_g07_terminals WHERE scopeId = ?",
      [restaurantId]
    );
    const [ords] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_toctou_orders WHERE restaurantId = ?",
      [restaurantId]
    );
    const [rest] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM restaurants WHERE id = ?",
      [restaurantId]
    );
    return {
      restaurant: Number((rest as { c: number }[])[0]?.c ?? 0),
      categories: Number((cats as { c: number }[])[0]?.c ?? 0),
      items: Number((items as { c: number }[])[0]?.c ?? 0),
      terminals: Number((terms as { c: number }[])[0]?.c ?? 0),
      orders: Number((ords as { c: number }[])[0]?.c ?? 0),
    };
  }

  async function createOrderChild(
    db: OccupancyTestTidb["db"],
    restaurantId: number,
    delayMs = 0
  ) {
    return db.transaction(
      async (tx) => {
        await requireRestaurantRowForUpdate(tx, restaurantId);
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        await tx.execute(
          sql`INSERT INTO occupancy_toctou_orders (restaurantId) VALUES (${restaurantId})`
        );
        return { ok: true };
      },
      { isolationLevel: "read committed" }
    );
  }

  it("records non-production TiDB identity", () => {
    expect(tidb.identity.verdict).toBe("ACCEPT_NON_PRODUCTION");
    expect(tidb.identity.sameSqlUserAsProductionMain).toBe(false);
    expect(tidb.engine.version).toMatch(/tidb/i);
  });

  it("delete ∥ category create leaves restaurant gone and zero orphans", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    const raced = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 5,
        delayMs: 400,
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
      })(),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(0);
    expect(counts.categories).toBe(0);
    evidence.category = { create: raced[0]?.status, ...counts };
  });

  it("delete ∥ item create leaves zero orphan items", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await Promise.allSettled([
      createItemLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        categoryId: category.id,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 5,
        delayMs: 400,
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
      })(),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(0);
    expect(counts.items).toBe(0);
    expect(counts.categories).toBe(0);
    evidence.item = counts;
  });

  it("delete ∥ POS provision leaves zero orphan terminals", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await Promise.allSettled([
      provisionTerminalLocked({
        db: tidb.db,
        scopeId: restaurant.id,
        cap: 5,
        lockRestaurantId: restaurant.id,
        delayMs: 400,
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
      })(),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(0);
    expect(counts.terminals).toBe(0);
    evidence.posProvision = counts;
  });

  it("delete ∥ POS replace leaves zero orphan terminals", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    const seed = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: restaurant.id,
      cap: 5,
      lockRestaurantId: restaurant.id,
    });
    await Promise.allSettled([
      provisionTerminalLocked({
        db: tidb.db,
        scopeId: restaurant.id,
        cap: 5,
        occupancyDelta: 0,
        lockRestaurantId: restaurant.id,
        delayMs: 400,
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          await new Promise((resolve) => setTimeout(resolve, 400));
          const next = await exec.execute(
            sql`INSERT INTO occupancy_g07_terminals (scopeId, provisioned) VALUES (${restaurant.id}, 1)`
          );
          void next;
          await exec.execute(
            sql`UPDATE occupancy_g07_terminals SET provisioned = 0 WHERE id = ${seed.id}`
          );
          return { id: seed.id, replacementId: seed.id };
        },
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
      })(),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(0);
    expect(counts.terminals).toBe(0);
    evidence.posReplace = counts;
  });

  it("delete ∥ order create leaves zero orphan orders", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await Promise.allSettled([
      createOrderChild(tidb.db, restaurant.id, 400),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await tidb.dbB.transaction(
          async (tx) => {
            await lockRestaurantRowForUpdate(tx, restaurant.id);
            await tx.execute(
              sql`DELETE FROM occupancy_toctou_orders WHERE restaurantId = ${restaurant.id}`
            );
            await tx.execute(
              sql`DELETE FROM restaurants WHERE id = ${restaurant.id}`
            );
          },
          { isolationLevel: "read committed" }
        );
      })(),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(0);
    expect(counts.orders).toBe(0);
    evidence.order = counts;
  });

  it("two concurrent deletes are deterministic and leave no restaurant row", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await Promise.allSettled([
      deleteRestaurantLockedCascade(tidb.db, restaurant.id),
      deleteRestaurantLockedCascade(tidb.dbB, restaurant.id),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(0);
    expect(counts.categories).toBe(0);
    evidence.deleteVsDelete = counts;
  });

  it("create ∥ delete ∥ create leaves zero orphans", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 5,
        delayMs: 400,
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
      })(),
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 5,
        delayMs: 250,
      }),
    ]);
    const counts = await orphanCounts(restaurant.id);
    if (counts.restaurant === 0) {
      expect(counts.categories).toBe(0);
    } else {
      expect(counts.restaurant).toBe(1);
    }
    evidence.createDeleteCreate = counts;
  });

  it("create ∥ create remains occupancy-safe and parent-valid", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 2,
    });
    const raced = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 2,
        delayMs: 200,
      }),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 2,
      }),
    ]);
    const counts = await orphanCounts(restaurant.id);
    expect(counts.restaurant).toBe(1);
    expect(counts.categories).toBe(2);
    expect(counts.categories).toBeLessThanOrEqual(2);
    evidence.createVsCreate = {
      createA: raced[0]?.status,
      createB: raced[1]?.status,
      ...counts,
    };
  });

  it("tenant B create is not blocked by tenant A delete", async () => {
    await cleanupToctou();
    const a = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    const b = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_B,
      cap: 5,
    });
    const started = Date.now();
    await Promise.all([
      deleteRestaurantLockedCascade(tidb.db, a.id),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: b.id,
        ownerUserId: TOCTOU_OWNER_B,
        cap: 5,
      }),
    ]);
    const elapsed = Date.now() - started;
    const countsA = await orphanCounts(a.id);
    const countsB = await orphanCounts(b.id);
    expect(countsA.restaurant).toBe(0);
    expect(countsB.restaurant).toBe(1);
    expect(countsB.categories).toBe(1);
    evidence.crossTenant = { elapsedMs: elapsed, a: countsA, b: countsB };
  });

  it("failure after child insert rolls back with zero orphans", async () => {
    await cleanupToctou();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: TOCTOU_OWNER_A,
      cap: 5,
    });
    await expect(
      tidb.db.transaction(
        async (tx) => {
          await requireRestaurantRowForUpdate(tx, restaurant.id);
          await tx.execute(
            sql`INSERT INTO categories (restaurantId, nameAr) VALUES (${restaurant.id}, ${"G08-cat"})`
          );
          throw new Error("toctou_injected_failure_after_insert");
        },
        { isolationLevel: "read committed" }
      )
    ).rejects.toThrow("toctou_injected_failure_after_insert");
    const counts = await orphanCounts(restaurant.id);
    expect(counts.categories).toBe(0);
    expect(counts.restaurant).toBe(1);
    evidence.failureInjection = counts;
  });

  it("create against a missing restaurant fails closed", async () => {
    await expect(
      createCategoryLocked({
        db: tidb.db,
        restaurantId: 2147483000,
        ownerUserId: TOCTOU_OWNER_A,
        cap: 5,
      })
    ).rejects.toBeInstanceOf(RestaurantGoneError);
  });
}, 120000);

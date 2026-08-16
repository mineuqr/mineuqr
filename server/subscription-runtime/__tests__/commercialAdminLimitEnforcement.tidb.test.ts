/**
 * COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1
 * Real TiDB: owner and admin quantity creates share one Commercial cap.
 * G07_DATABASE_URL / mineuqr-stagIn only.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
} from "../commercialLimitOccupancy";
import { throwCommercialOccupancyTrpcError } from "../commercialOccupancyTrpc";
import {
  readG07DatabaseUrl,
  startOccupancyTestTidb,
  type OccupancyTestTidb,
} from "./occupancyTestTidb";
import {
  createCategoryLocked,
  createItemLocked,
  createRestaurantLocked,
  deleteRestaurantLockedCascade,
  ensureG08FixtureTables,
} from "./occupancyG08Tidb";
import { TRPCError } from "@trpc/server";

const G09_OWNER_A = 981001001;
const G09_OWNER_B = 981001002;

const supplied = readG07DatabaseUrl();
if (process.env.G07_REQUIRE_TIDB === "1" && !supplied) {
  throw new Error(
    "G-09 STOP: G07_REQUIRE_TIDB=1 but G07_DATABASE_URL / TIDB_TEST_DATABASE_URL is missing"
  );
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 120000 });

describe.skipIf(!supplied)("G-09 admin commercial quantity TiDB races", () => {
  let tidb: OccupancyTestTidb;
  const evidence: Record<string, unknown> = {};

  beforeAll(async () => {
    tidb = await startOccupancyTestTidb();
    await ensureG08FixtureTables(tidb.pool);
    await cleanupG09();
    evidence.identity = tidb.identity;
    evidence.engine = tidb.engine;
  }, 120000);

  afterAll(async () => {
    if (tidb) {
      await cleanupG09();
      await tidb.stop();
    }
    // eslint-disable-next-line no-console
    console.log("G09_EVIDENCE " + JSON.stringify(evidence));
  });

  async function cleanupG09(): Promise<void> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE userId IN (?, ?)",
      [G09_OWNER_A, G09_OWNER_B]
    );
    const ids = (rows as { id: number }[]).map((row) => Number(row.id));
    if (ids.length === 0) return;
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

  async function categoryCount(restaurantId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM categories WHERE restaurantId = ?",
      [restaurantId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function restaurantCount(restaurantId: number): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM restaurants WHERE id = ?",
      [restaurantId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  it("records non-production TiDB identity", () => {
    expect(tidb.identity.verdict).toBe("ACCEPT_NON_PRODUCTION");
    expect(tidb.identity.sameSqlUserAsProductionMain).toBe(false);
    expect(tidb.engine.version).toMatch(/tidb/i);
  });

  it("admin-equivalent create at cap-1 fills the last slot and stays at cap", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G09_OWNER_A,
      cap: 2,
    });
    const created = await createCategoryLocked({
      db: tidb.dbB,
      restaurantId: restaurant.id,
      ownerUserId: G09_OWNER_A,
      cap: 2,
    });
    const occ = await categoryCount(restaurant.id);
    expect(created.id).toBeGreaterThan(0);
    expect(occ).toBe(2);
    evidence.capMinusOne = { occupancy: occ, cap: 2 };
  });

  it("admin-equivalent create at cap is rejected and occupancy stays at cap", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G09_OWNER_A,
      cap: 1,
    });
    await expect(
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G09_OWNER_A,
        cap: 1,
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
    expect(await categoryCount(restaurant.id)).toBe(1);
    evidence.atCap = { occupancy: 1, cap: 1 };
  });

  it("owner create ∥ admin create at last slot yields occupancy <= cap", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G09_OWNER_A,
      cap: 2,
    });
    const raced = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G09_OWNER_A,
        cap: 2,
        delayMs: 250,
      }),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G09_OWNER_A,
        cap: 2,
      }),
    ]);
    const occ = await categoryCount(restaurant.id);
    const fulfilled = raced.filter((row) => row.status === "fulfilled").length;
    const exceeded = raced.filter(
      (row) =>
        row.status === "rejected" &&
        row.reason instanceof CommercialLimitExceededError
    ).length;
    expect(occ).toBeLessThanOrEqual(2);
    expect(occ).toBe(2);
    expect(fulfilled).toBe(1);
    expect(exceeded).toBe(1);
    evidence.ownerVsAdmin = {
      occupancy: occ,
      fulfilled,
      exceeded,
      a: raced[0]?.status,
      b: raced[1]?.status,
    };
  });

  it("admin create ∥ admin create at last slot yields occupancy <= cap", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G09_OWNER_A,
      cap: 2,
    });
    const raced = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G09_OWNER_A,
        cap: 2,
        delayMs: 200,
      }),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G09_OWNER_A,
        cap: 2,
        delayMs: 200,
      }),
    ]);
    const occ = await categoryCount(restaurant.id);
    expect(occ).toBe(2);
    expect(occ).toBeLessThanOrEqual(2);
    evidence.adminVsAdmin = { occupancy: occ, a: raced[0]?.status, b: raced[1]?.status };
  });

  it("admin create ∥ restaurant delete leaves zero orphan categories", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G09_OWNER_A,
        cap: 5,
        delayMs: 400,
      }),
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
      })(),
    ]);
    expect(await restaurantCount(restaurant.id)).toBe(0);
    expect(await categoryCount(restaurant.id)).toBe(0);
    evidence.adminVsDelete = {
      restaurant: 0,
      categories: 0,
    };
  });

  it("tenant B admin-equivalent create is independent of tenant A", async () => {
    await cleanupG09();
    const a = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    const b = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_B,
      cap: 5,
    });
    const started = Date.now();
    await Promise.all([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: a.id,
        ownerUserId: G09_OWNER_A,
        cap: 1,
      }),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: b.id,
        ownerUserId: G09_OWNER_B,
        cap: 1,
      }),
    ]);
    const elapsed = Date.now() - started;
    expect(await categoryCount(a.id)).toBe(1);
    expect(await categoryCount(b.id)).toBe(1);
    evidence.crossTenant = { elapsedMs: elapsed, a: 1, b: 1 };
  });

  it("item owner ∥ admin last-slot race stays at item cap", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await createItemLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      categoryId: category.id,
      ownerUserId: G09_OWNER_A,
      cap: 2,
    });
    await Promise.allSettled([
      createItemLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        categoryId: category.id,
        ownerUserId: G09_OWNER_A,
        cap: 2,
        delayMs: 200,
      }),
      createItemLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        categoryId: category.id,
        ownerUserId: G09_OWNER_A,
        cap: 2,
      }),
    ]);
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM menu_items WHERE restaurantId = ?",
      [restaurant.id]
    );
    const occ = Number((rows as { c: number }[])[0]?.c ?? 0);
    expect(occ).toBe(2);
    evidence.itemOwnerVsAdmin = { occupancy: occ };
  });

  it("failure after insert rolls back and does not consume a slot", async () => {
    await cleanupG09();
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G09_OWNER_A,
      cap: 5,
    });
    await expect(
      tidb.db.transaction(
        async (tx) => {
          await tx.execute(
            sql`INSERT INTO categories (restaurantId, nameAr) VALUES (${restaurant.id}, ${"G09-fail"})`
          );
          throw new Error("g09_injected_failure_after_insert");
        },
        { isolationLevel: "read committed" }
      )
    ).rejects.toThrow("g09_injected_failure_after_insert");
    expect(await categoryCount(restaurant.id)).toBe(0);
    evidence.failureInjection = { occupancy: 0 };
  });

  it("G-06 maps admin capacity failure to FORBIDDEN, not unauthorized", () => {
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialLimitExceededError("limit_exceeded", 2),
        (cap) => `خطتك الحالية تسمح بحد أقصى ${cap} فئات لهذا الموقع.`
      );
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
      expect((error as TRPCError).message).not.toMatch(/unauthor/i);
    }
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialOccupancyUnavailableError(),
        () => "unused"
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
    evidence.errorSemantics = { exceeded: "FORBIDDEN", unavailable: "INTERNAL_SERVER_ERROR" };
  });
});

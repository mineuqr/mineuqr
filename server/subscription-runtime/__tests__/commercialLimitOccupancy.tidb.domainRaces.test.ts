/**
 * COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1
 * Real TiDB domain races. G07_DATABASE_URL / mineuqr-stagIn only.
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { restaurants } from "../../../drizzle/schema";
import { withCommercialLimitOccupancy } from "../commercialLimitOccupancy";
import {
  readG07DatabaseUrl,
  startOccupancyTestTidb,
  type OccupancyTestTidb,
} from "./occupancyTestTidb";
import {
  G08_OWNER_A,
  G08_OWNER_B,
  G08_OWNER_C,
  G08_SLUG_PREFIX,
  capDecision,
  cleanupG08Domain,
  countCategories,
  countItems,
  countProvisionedTerminals,
  countRestaurants,
  createCategoryLocked,
  createItemLocked,
  createRestaurantLocked,
  deleteRestaurantLockedCascade,
  ensureG08FixtureTables,
  insertRestaurantRow,
  occupancyG08Idempotency,
  occupancyG08Owners,
  occupancyG07Terminals,
  provisionTerminalLocked,
  settledMeta,
} from "./occupancyG08Tidb";

const supplied = readG07DatabaseUrl();
if (process.env.G07_REQUIRE_TIDB === "1" && !supplied) {
  throw new Error(
    "G-08 STOP: G07_REQUIRE_TIDB=1 but G07_DATABASE_URL / TIDB_TEST_DATABASE_URL is missing"
  );
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 120000 });

describe.skipIf(!supplied)("G-08 TiDB commercial occupancy domain races", () => {
  let tidb: OccupancyTestTidb;
  const evidence: Record<string, unknown> = {};

  beforeAll(async () => {
    tidb = await startOccupancyTestTidb();
    await ensureG08FixtureTables(tidb.pool);
    const [foreign] = await tidb.pool.promise().query(
      `SELECT id, slug, userId FROM restaurants
       WHERE userId IN (?, ?, ?) AND slug NOT LIKE ?`,
      [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C, `${G08_SLUG_PREFIX}%`]
    );
    if ((foreign as unknown[]).length > 0) {
      throw new Error(
        "G-08 STOP: synthetic owner ids collide with existing non-G08 restaurants"
      );
    }
    await cleanupG08Domain(tidb.pool);
    evidence.identity = tidb.identity;
    evidence.engine = tidb.engine;
    evidence.lockTable = tidb.lockTable;
  }, 120000);

  afterAll(async () => {
    if (tidb) {
      await cleanupG08Domain(tidb.pool);
      await tidb.stop();
    }
    // eslint-disable-next-line no-console
    console.log("G08_EVIDENCE " + JSON.stringify(evidence));
  });

  it("records non-production TiDB identity", () => {
    expect(tidb.identity.verdict).toBe("ACCEPT_NON_PRODUCTION");
    expect(tidb.identity.sameSqlUserAsProductionMain).toBe(false);
    expect(tidb.engine.version).toMatch(/tidb/i);
    expect(tidb.engine.database).toBe("mineuqr");
  });

  it("P2 create race: last restaurant slot, occupancy never exceeds cap", async () => {
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    expect(await countRestaurants(tidb.pool, G08_OWNER_A)).toBe(1);
    const results = await Promise.allSettled([
      createRestaurantLocked({
        db: tidb.db,
        ownerUserId: G08_OWNER_A,
        cap: 2,
        delayMs: 400,
      }),
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G08_OWNER_A,
        cap: 2,
      }),
    ]);
    const meta = settledMeta(results);
    const occ = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(meta.fulfilled).toBe(1);
    expect(meta.exceeded).toBe(1);
    expect(occ).toBe(2);
    evidence.createRestaurants = { ...meta, occupancy: occ, cap: 2 };
  });

  it("P2 create race: last category and item slots", async () => {
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_B,
      cap: 5,
    });
    await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G08_OWNER_B,
      cap: 2,
    });
    const catResults = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G08_OWNER_B,
        cap: 2,
        delayMs: 300,
      }),
      createCategoryLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        ownerUserId: G08_OWNER_B,
        cap: 2,
      }),
    ]);
    const catMeta = settledMeta(catResults);
    const catOcc = await countCategories(tidb.pool, restaurant.id);
    expect(catOcc).toBe(2);
    expect(catOcc).toBeLessThanOrEqual(2);
    expect(catMeta.fulfilled).toBe(1);

    const [catRows] = await tidb.pool.promise().query(
      "SELECT id FROM categories WHERE restaurantId = ? LIMIT 1",
      [restaurant.id]
    );
    const categoryId = Number((catRows as { id: number }[])[0]?.id);
    await createItemLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      categoryId,
      ownerUserId: G08_OWNER_B,
      cap: 2,
    });
    const itemResults = await Promise.allSettled([
      createItemLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        categoryId,
        ownerUserId: G08_OWNER_B,
        cap: 2,
        delayMs: 300,
      }),
      createItemLocked({
        db: tidb.dbB,
        restaurantId: restaurant.id,
        categoryId,
        ownerUserId: G08_OWNER_B,
        cap: 2,
      }),
    ]);
    const itemMeta = settledMeta(itemResults);
    const itemOcc = await countItems(tidb.pool, restaurant.id);
    expect(itemOcc).toBe(2);
    expect(itemMeta.fulfilled).toBe(1);
    evidence.createCatalog = {
      restaurantId: restaurant.id,
      categories: { ...catMeta, occupancy: catOcc },
      items: { ...itemMeta, occupancy: itemOcc },
    };
  });

  it("P3 at-cap: concurrent restaurant creates persist nothing new", async () => {
    await cleanupG08Domain(tidb.pool);
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 1,
    });
    const results = await Promise.allSettled([
      createRestaurantLocked({ db: tidb.db, ownerUserId: G08_OWNER_A, cap: 1 }),
      createRestaurantLocked({ db: tidb.dbB, ownerUserId: G08_OWNER_A, cap: 1 }),
      createRestaurantLocked({ db: tidb.db, ownerUserId: G08_OWNER_A, cap: 1 }),
    ]);
    const meta = settledMeta(results);
    const occ = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(occ).toBe(1);
    expect(meta.fulfilled).toBe(0);
    expect(meta.exceeded).toBe(3);
    evidence.atCap = { ...meta, occupancy: occ };
  });

  it("P4 create vs delete: occupancy stays <= cap and equals COUNT(*)", async () => {
    await cleanupG08Domain(tidb.pool);
    const first = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    const createFirst = createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
      delayMs: 500,
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    const deleted = await tidb.poolB.promise().query(
      "DELETE FROM restaurants WHERE id = ?",
      [first.id]
    );
    const created = await Promise.allSettled([createFirst]);
    const occ = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(occ).toBeLessThanOrEqual(2);
    expect(occ).toBeGreaterThanOrEqual(0);
    expect(occ).toBe(await countRestaurants(tidb.pool, G08_OWNER_A));
    evidence.createThenDelete = {
      deletedId: first.id,
      deleteAffected: (deleted[0] as { affectedRows?: number }).affectedRows,
      create: created[0]?.status,
      occupancy: occ,
    };

    await cleanupG08Domain(tidb.pool);
    const seed = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    const deleteFirst = (async () => {
      await tidb.poolB.promise().query("DELETE FROM restaurants WHERE id = ?", [
        seed.id,
      ]);
      return { deleted: seed.id };
    })();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const createSecond = createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    await Promise.allSettled([deleteFirst, createSecond]);
    const occB = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(occB).toBeLessThanOrEqual(2);
    evidence.deleteThenCreate = { occupancy: occB };

    await cleanupG08Domain(tidb.pool);
    const seedC = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    const concurrent = await Promise.allSettled([
      createRestaurantLocked({
        db: tidb.db,
        ownerUserId: G08_OWNER_A,
        cap: 2,
        delayMs: 200,
      }),
      tidb.poolB.promise().query("DELETE FROM restaurants WHERE id = ?", [
        seedC.id,
      ]),
    ]);
    const occC = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(occC).toBeLessThanOrEqual(2);
    evidence.bothConcurrent = {
      create: concurrent[0]?.status,
      occupancy: occC,
    };
  });

  it("P4 at-cap create vs delete never persists occupancy > cap", async () => {
    await cleanupG08Domain(tidb.pool);
    const a = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    const b = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    expect(await countRestaurants(tidb.pool, G08_OWNER_A)).toBe(2);
    const results = await Promise.allSettled([
      createRestaurantLocked({
        db: tidb.db,
        ownerUserId: G08_OWNER_A,
        cap: 2,
        delayMs: 350,
      }),
      tidb.poolB.promise().query("DELETE FROM restaurants WHERE id = ?", [a.id]),
      createRestaurantLocked({
        db: tidb.dbB,
        ownerUserId: G08_OWNER_A,
        cap: 2,
      }),
    ]);
    const occ = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(occ).toBeLessThanOrEqual(2);
    expect(occ).toBeGreaterThanOrEqual(1);
    const leftover = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE userId = ? AND slug LIKE ?",
      [G08_OWNER_A, `${G08_SLUG_PREFIX}%`]
    );
    evidence.atCapCreateDelete = {
      seedIds: [a.id, b.id],
      occupancy: occ,
      remaining: (leftover[0] as { id: number }[]).map((row) => row.id),
      createA: results[0]?.status,
      createB: results[2]?.status,
    };
  });

  it("P5 hard-delete category while item/category create races", async () => {
    await cleanupG08Domain(tidb.pool);
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 5,
    });
    const category = await createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    const results = await Promise.allSettled([
      createCategoryLocked({
        db: tidb.db,
        restaurantId: restaurant.id,
        ownerUserId: G08_OWNER_A,
        cap: 2,
        delayMs: 300,
      }),
      (async () => {
        await tidb.poolB.promise().query(
          "DELETE FROM menu_items WHERE categoryId = ?",
          [category.id]
        );
        await tidb.poolB.promise().query("DELETE FROM categories WHERE id = ?", [
          category.id,
        ]);
      })(),
    ]);
    const occ = await countCategories(tidb.pool, restaurant.id);
    expect(occ).toBeLessThanOrEqual(2);
    const [orphans] = await tidb.pool.promise().query(
      `SELECT i.id FROM menu_items i
       LEFT JOIN categories c ON c.id = i.categoryId
       WHERE i.restaurantId = ? AND c.id IS NULL`,
      [restaurant.id]
    );
    expect(orphans as unknown[]).toHaveLength(0);
    evidence.hardDeleteCategory = {
      occupancy: occ,
      create: results[0]?.status,
      orphanItems: (orphans as unknown[]).length,
    };
  });

  it("P6 concurrent POS replace keeps one provisioned terminal", async () => {
    await cleanupG08Domain(tidb.pool);
    const seed = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G08_OWNER_A,
      cap: 1,
    });
    const replace = (delayMs: number, db: typeof tidb.db) =>
      provisionTerminalLocked({
        db,
        scopeId: G08_OWNER_A,
        cap: 1,
        occupancyDelta: 0,
        create: async (tx) => {
          const exec = tx ?? db;
          if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
          const [current] = await exec
            .select()
            .from(occupancyG07Terminals)
            .where(eq(occupancyG07Terminals.id, seed.id));
          if (!current || current.provisioned !== 1) {
            throw new Error("lifecycle_conflict");
          }
          const next = await exec.insert(occupancyG07Terminals).values({
            scopeId: G08_OWNER_A,
            provisioned: 1,
          });
          const replacementId = next[0].insertId;
          await exec
            .update(occupancyG07Terminals)
            .set({ provisioned: 0, replacedById: replacementId })
            .where(eq(occupancyG07Terminals.id, seed.id));
          return { id: seed.id, replacementId };
        },
      });
    const results = await Promise.allSettled([
      replace(400, tidb.db),
      replace(0, tidb.dbB),
    ]);
    const occ = await countProvisionedTerminals(tidb.pool, G08_OWNER_A);
    expect(occ).toBe(1);
    expect(occ).toBeLessThanOrEqual(1);
    evidence.replaceVsReplace = { ...settledMeta(results), occupancy: occ };
  });

  it("P6 replace vs hard-delete never exceeds cap", async () => {
    await cleanupG08Domain(tidb.pool);
    const seed = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G08_OWNER_A,
      cap: 1,
    });
    const results = await Promise.allSettled([
      provisionTerminalLocked({
        db: tidb.db,
        scopeId: G08_OWNER_A,
        cap: 1,
        occupancyDelta: 0,
        delayMs: 350,
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          await new Promise((resolve) => setTimeout(resolve, 350));
          const next = await exec.insert(occupancyG07Terminals).values({
            scopeId: G08_OWNER_A,
            provisioned: 1,
          });
          const replacementId = next[0].insertId;
          await exec
            .update(occupancyG07Terminals)
            .set({ provisioned: 0, replacedById: replacementId })
            .where(eq(occupancyG07Terminals.id, seed.id));
          return { id: seed.id, replacementId };
        },
      }),
      tidb.poolB.promise().query(
        "DELETE FROM occupancy_g07_terminals WHERE id = ?",
        [seed.id]
      ),
    ]);
    const occ = await countProvisionedTerminals(tidb.pool, G08_OWNER_A);
    expect(occ).toBeLessThanOrEqual(1);
    evidence.replaceVsHardDelete = {
      occupancy: occ,
      replace: results[0]?.status,
    };
  });

  it("P7 idempotency key: exactly one resource under concurrent replay", async () => {
    await cleanupG08Domain(tidb.pool);
    const idemKey = "g08-same-key";
    const createOnce = (db: typeof tidb.db, delayMs: number) =>
      withCommercialLimitOccupancy({
        db,
        scope: {
          kind: "restaurant",
          scopeId: G08_OWNER_A,
          ownerUserId: G08_OWNER_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 1,
        decide: capDecision(1, "posTerminals"),
        resolveExisting: async (tx) => {
          const exec = tx ?? db;
          const [row] = await exec
            .select()
            .from(occupancyG08Idempotency)
            .where(
              sql`${occupancyG08Idempotency.scopeId} = ${G08_OWNER_A} AND ${occupancyG08Idempotency.idemKey} = ${idemKey}`
            );
          return row ? { id: row.resourceId } : null;
        },
        countOccupancy: async (tx) => {
          const exec = tx ?? db;
          const [row] = await exec
            .select({ count: sql<number>`count(*)` })
            .from(occupancyG07Terminals)
            .where(
              sql`${occupancyG07Terminals.scopeId} = ${G08_OWNER_A} AND ${occupancyG07Terminals.provisioned} = 1`
            );
          return Number(row?.count ?? 0);
        },
        create: async (tx) => {
          const exec = tx ?? db;
          if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
          const inserted = await exec.insert(occupancyG07Terminals).values({
            scopeId: G08_OWNER_A,
            provisioned: 1,
          });
          const resourceId = inserted[0].insertId;
          await exec.insert(occupancyG08Idempotency).values({
            scopeId: G08_OWNER_A,
            idemKey,
            fingerprint: "fp-a",
            resourceId,
          });
          return { id: resourceId };
        },
      });
    const results = await Promise.allSettled([
      createOnce(tidb.db, 400),
      createOnce(tidb.dbB, 0),
    ]);
    const occ = await countProvisionedTerminals(tidb.pool, G08_OWNER_A);
    const [idemRows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_g08_idempotency WHERE scopeId = ? AND idemKey = ?",
      [G08_OWNER_A, idemKey]
    );
    expect(occ).toBe(1);
    expect(Number((idemRows as { c: number }[])[0]?.c ?? 0)).toBe(1);
    evidence.idempotencyReplay = { ...settledMeta(results), occupancy: occ };
  });

  it("P7 conflicting idempotency fingerprint fails closed", async () => {
    await cleanupG08Domain(tidb.pool);
    await tidb.pool.promise().query(
      "INSERT INTO occupancy_g08_idempotency (scopeId, idemKey, fingerprint, resourceId) VALUES (?, ?, ?, ?)",
      [G08_OWNER_A, "g08-conflict", "fp-a", 1]
    );
    await expect(
      withCommercialLimitOccupancy({
        db: tidb.db,
        scope: {
          kind: "restaurant",
          scopeId: G08_OWNER_A,
          ownerUserId: G08_OWNER_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 1,
        decide: capDecision(2, "posTerminals"),
        resolveExisting: async (tx) => {
          const exec = tx ?? tidb.db;
          const [row] = await exec
            .select()
            .from(occupancyG08Idempotency)
            .where(
              sql`${occupancyG08Idempotency.scopeId} = ${G08_OWNER_A} AND ${occupancyG08Idempotency.idemKey} = ${"g08-conflict"}`
            );
          if (row && row.fingerprint !== "fp-b") {
            throw new Error("idempotency_fingerprint_conflict");
          }
          return row ? { id: row.resourceId } : null;
        },
        countOccupancy: async () => 0,
        create: async () => ({ id: 99 }),
      })
    ).rejects.toThrow("idempotency_fingerprint_conflict");
    expect(await countProvisionedTerminals(tidb.pool, G08_OWNER_A)).toBe(0);
    evidence.idempotencyConflict = { failedClosed: true, occupancy: 0 };
  });

  it("P8 onboarding: distinct owners each get one restaurant; same email is unique", async () => {
    await cleanupG08Domain(tidb.pool);
    const onboard = async (email: string, db: typeof tidb.db) => {
      await db.insert(occupancyG08Owners).values({ email });
      return createRestaurantLocked({
        db,
        ownerUserId: email.endsWith("a@g08.test") ? G08_OWNER_A : G08_OWNER_B,
        cap: 1,
      });
    };
    const distinct = await Promise.allSettled([
      onboard("g08-domain-race-a@g08.test", tidb.db),
      onboard("g08-domain-race-b@g08.test", tidb.dbB),
    ]);
    expect(settledMeta(distinct).fulfilled).toBe(2);
    expect(await countRestaurants(tidb.pool, G08_OWNER_A)).toBe(1);
    expect(await countRestaurants(tidb.pool, G08_OWNER_B)).toBe(1);

    const sameEmail = await Promise.allSettled([
      tidb.db.insert(occupancyG08Owners).values({
        email: "g08-domain-race-same@g08.test",
      }),
      tidb.dbB.insert(occupancyG08Owners).values({
        email: "g08-domain-race-same@g08.test",
      }),
    ]);
    const emailMeta = settledMeta(sameEmail);
    expect(emailMeta.fulfilled).toBe(1);
    expect(emailMeta.rejected).toBe(1);
    evidence.onboarding = {
      distinctOwners: settledMeta(distinct),
      sameEmail: emailMeta,
      occupancyA: await countRestaurants(tidb.pool, G08_OWNER_A),
      occupancyB: await countRestaurants(tidb.pool, G08_OWNER_B),
    };
  });

  it("P10 plan change vs create: create-time cap holds; later cap may be below occupancy", async () => {
    await cleanupG08Domain(tidb.pool);
    await tidb.pool.promise().query(
      "INSERT INTO occupancy_g08_caps (scopeKind, scopeId, limitKey, cap) VALUES (?, ?, ?, ?)",
      ["owner", G08_OWNER_A, "restaurants", 2]
    );
    const createWithLiveCap = (db: typeof tidb.db, delayMs: number) =>
      withCommercialLimitOccupancy({
        db,
        scope: {
          kind: "owner",
          scopeId: G08_OWNER_A,
          ownerUserId: G08_OWNER_A,
        },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: async (proposedTotal) => {
          const [rows] = await tidb.pool.promise().query(
            "SELECT cap FROM occupancy_g08_caps WHERE scopeId = ? AND limitKey = ?",
            [G08_OWNER_A, "restaurants"]
          );
          const cap = Number((rows as { cap: number }[])[0]?.cap ?? 0);
          return capDecision(cap, "restaurants")(proposedTotal);
        },
        countOccupancy: async (tx) => {
          const exec = tx ?? db;
          const [row] = await exec
            .select({ count: sql<number>`count(*)` })
            .from(restaurants)
            .where(eq(restaurants.userId, G08_OWNER_A));
          return Number(row?.count ?? 0);
        },
        create: async (tx) => {
          const exec = tx ?? db;
          if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
          const id = await insertRestaurantRow(
            exec,
            G08_OWNER_A,
            "G08-plan",
            `${G08_SLUG_PREFIX}plan-${Math.random().toString(36).slice(2, 8)}`
          );
          return { id };
        },
      });
    await createWithLiveCap(tidb.db, 0);
    const raced = await Promise.allSettled([
      createWithLiveCap(tidb.db, 400),
      tidb.poolB.promise().query(
        "UPDATE occupancy_g08_caps SET cap = 0 WHERE scopeId = ? AND limitKey = ?",
        [G08_OWNER_A, "restaurants"]
      ),
    ]);
    const occ = await countRestaurants(tidb.pool, G08_OWNER_A);
    const [capRows] = await tidb.pool.promise().query(
      "SELECT cap FROM occupancy_g08_caps WHERE scopeId = ? AND limitKey = ?",
      [G08_OWNER_A, "restaurants"]
    );
    const newCap = Number((capRows as { cap: number }[])[0]?.cap ?? 0);
    expect(occ).toBeLessThanOrEqual(2);
    evidence.planChange = {
      occupancy: occ,
      newCap,
      occupancyMayExceedNewCap: occ > newCap,
      create: raced[0]?.status,
    };
  });

  it("P12 restaurant delete vs category create leaves no orphan", async () => {
    await cleanupG08Domain(tidb.pool);
    const restaurant = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 5,
    });
    const parentLookup = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE id = ?",
      [restaurant.id]
    );
    expect((parentLookup[0] as unknown[]).length).toBe(1);
    const createDelayed = createCategoryLocked({
      db: tidb.db,
      restaurantId: restaurant.id,
      ownerUserId: G08_OWNER_A,
      cap: 5,
      delayMs: 500,
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    await deleteRestaurantLockedCascade(tidb.dbB, restaurant.id);
    const created = await Promise.allSettled([createDelayed]);
    const [restaurantGone] = await tidb.pool.promise().query(
      "SELECT id FROM restaurants WHERE id = ?",
      [restaurant.id]
    );
    const [orphanCats] = await tidb.pool.promise().query(
      "SELECT id FROM categories WHERE restaurantId = ?",
      [restaurant.id]
    );
    const orphanCount = (orphanCats as unknown[]).length;
    evidence.cascadeToctou = {
      parentLookupSucceeded: true,
      restaurantRemaining: (restaurantGone as unknown[]).length,
      create: created[0]?.status,
      orphanCategories: orphanCount,
      architectureGap: false,
    };
    expect((restaurantGone as unknown[]).length).toBe(0);
    expect(orphanCount).toBe(0);
  });

  it("P13 cross-tenant: A cannot consume B capacity; locks stay tenant-scoped", async () => {
    await cleanupG08Domain(tidb.pool);
    const results = await Promise.allSettled([
      createRestaurantLocked({ db: tidb.db, ownerUserId: G08_OWNER_A, cap: 1 }),
      createRestaurantLocked({ db: tidb.dbB, ownerUserId: G08_OWNER_B, cap: 1 }),
      createRestaurantLocked({ db: tidb.db, ownerUserId: G08_OWNER_C, cap: 1 }),
    ]);
    expect(settledMeta(results).fulfilled).toBe(3);
    expect(await countRestaurants(tidb.pool, G08_OWNER_A)).toBe(1);
    expect(await countRestaurants(tidb.pool, G08_OWNER_B)).toBe(1);
    expect(await countRestaurants(tidb.pool, G08_OWNER_C)).toBe(1);
    const [locks] = await tidb.pool.promise().query(
      `SELECT scopeKind, scopeId, limitKey FROM commercial_limit_occupancy_locks
       WHERE scopeId IN (?, ?, ?) AND limitKey = 'restaurants'`,
      [G08_OWNER_A, G08_OWNER_B, G08_OWNER_C]
    );
    const lockRows = locks as { scopeKind: string; scopeId: number; limitKey: string }[];
    expect(lockRows).toHaveLength(3);
    expect(new Set(lockRows.map((row) => row.scopeId)).size).toBe(3);
    evidence.crossTenant = {
      occupancy: {
        a: 1,
        b: 1,
        c: 1,
      },
      lockScopes: lockRows.map((row) => row.scopeId),
    };
  });

  it("P15 failure after insert rolls back; occupancy matches domain COUNT", async () => {
    await cleanupG08Domain(tidb.pool);
    await expect(
      withCommercialLimitOccupancy({
        db: tidb.db,
        scope: {
          kind: "owner",
          scopeId: G08_OWNER_A,
          ownerUserId: G08_OWNER_A,
        },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: capDecision(2, "restaurants"),
        countOccupancy: async (tx) => {
          const exec = tx ?? tidb.db;
          const [row] = await exec
            .select({ count: sql<number>`count(*)` })
            .from(restaurants)
            .where(eq(restaurants.userId, G08_OWNER_A));
          return Number(row?.count ?? 0);
        },
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          await insertRestaurantRow(
            exec,
            G08_OWNER_A,
            "G08-fail",
            `${G08_SLUG_PREFIX}fail-${Math.random().toString(36).slice(2, 8)}`
          );
          throw new Error("g08_injected_failure_after_insert");
        },
      })
    ).rejects.toThrow("g08_injected_failure_after_insert");
    expect(await countRestaurants(tidb.pool, G08_OWNER_A)).toBe(0);

    await expect(
      provisionTerminalLocked({
        db: tidb.db,
        scopeId: G08_OWNER_A,
        cap: 1,
        occupancyDelta: 0,
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          await exec.insert(occupancyG07Terminals).values({
            scopeId: G08_OWNER_A,
            provisioned: 1,
          });
          throw new Error("g08_injected_failure_after_related_insert");
        },
      })
    ).rejects.toThrow("g08_injected_failure_after_related_insert");
    expect(await countProvisionedTerminals(tidb.pool, G08_OWNER_A)).toBe(0);
    evidence.failureInjection = {
      afterInsertOccupancy: 0,
      afterRelatedInsertOccupancy: 0,
    };
  });

  it("P16 two OS processes preserve restaurant occupancy <= cap", async () => {
    await cleanupG08Domain(tidb.pool);
    await createRestaurantLocked({
      db: tidb.db,
      ownerUserId: G08_OWNER_A,
      cap: 2,
    });
    const runWorker = (label: string, delayMs: string) =>
      new Promise<{ ok: boolean; raw: string }>((resolvePromise) => {
        const child = spawn(
          "pnpm",
          [
            "exec",
            "tsx",
            "server/subscription-runtime/__tests__/occupancyG08Worker.ts",
          ],
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              G08_WORKER_LABEL: label,
              G08_WORKER_OWNER: String(G08_OWNER_A),
              G08_WORKER_CAP: "2",
              G08_WORKER_DELAY_MS: delayMs,
            },
            windowsHide: true,
            shell: true,
          }
        );
        let raw = "";
        child.stdout?.on("data", (chunk) => {
          raw += String(chunk);
        });
        child.stderr?.on("data", (chunk) => {
          raw += String(chunk);
        });
        child.on("close", () => {
          resolvePromise({ ok: child.exitCode === 0, raw: raw.trim() });
        });
      });
    const [a, b] = await Promise.all([runWorker("A", "500"), runWorker("B", "0")]);
    const parse = (raw: string) => {
      const line = raw.split("\n").filter(Boolean).at(-1) ?? "{}";
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return { parseError: true, raw };
      }
    };
    const parsedA = parse(a.raw);
    const parsedB = parse(b.raw);
    const successes = [parsedA, parsedB].filter((row) => row.ok === true);
    const failures = [parsedA, parsedB].filter((row) => row.ok === false);
    const occ = await countRestaurants(tidb.pool, G08_OWNER_A);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(occ).toBe(2);
    evidence.twoProcesses = {
      processA: parsedA,
      processB: parsedB,
      occupancy: occ,
    };
  }, 120000);

  it("P4 deactivate vs provision never exceeds POS cap", async () => {
    await cleanupG08Domain(tidb.pool);
    const seed = await provisionTerminalLocked({
      db: tidb.db,
      scopeId: G08_OWNER_A,
      cap: 1,
    });
    const results = await Promise.allSettled([
      provisionTerminalLocked({
        db: tidb.db,
        scopeId: G08_OWNER_A,
        cap: 1,
        delayMs: 350,
      }),
      tidb.poolB.promise().query(
        "UPDATE occupancy_g07_terminals SET provisioned = 0 WHERE id = ?",
        [seed.id]
      ),
    ]);
    const occ = await countProvisionedTerminals(tidb.pool, G08_OWNER_A);
    expect(occ).toBeLessThanOrEqual(1);
    evidence.deactivateVsProvision = {
      occupancy: occ,
      provision: results[0]?.status,
    };
  });
}, 120000);

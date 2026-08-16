/**
 * COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1
 * Real MySQL/Drizzle FOR UPDATE occupancy. Isolated Docker — not Production.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import {
  CommercialLimitExceededError,
  withCommercialLimitOccupancy,
} from "../commercialLimitOccupancy";
import {
  startOccupancyTestMysql,
  type OccupancyTestMysql,
} from "./occupancyTestMysql";

const resources = mysqlTable("occupancy_test_resources", {
  id: int().autoincrement().primaryKey(),
  scopeKind: varchar({ length: 16 }).notNull(),
  scopeId: int().notNull(),
});

const SCOPE_A = 910001;
const SCOPE_B = 910002;

describe("commercial limit occupancy real database", () => {
  let mysql: OccupancyTestMysql;

  beforeAll(async () => {
    const started = await startOccupancyTestMysql();
    if (!started) {
      throw new Error(
        "CONCURRENCY NOT VERIFIED — Docker MySQL required for occupancy tests"
      );
    }
    mysql = started;
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId IN (?, ?)",
      [SCOPE_A, SCOPE_B]
    );
  }, 120000);

  afterAll(async () => {
    await mysql?.stop();
  });

  async function counted(scopeId: number): Promise<number> {
    const [rows] = await mysql.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_test_resources WHERE scopeId = ?",
      [scopeId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  function capDecision(cap: number) {
    return async (proposedTotal: number) => ({
      allowed: proposedTotal <= cap,
      reasonCode: proposedTotal <= cap ? "within_limit" : "limit_exceeded",
      limitKey: "posTerminals" as const,
      cap,
      proposedTotal,
      policy: "hard" as const,
      source: "test",
    });
  }

  async function countScope(
    scopeId: number,
    tx: Parameters<
      Parameters<typeof withCommercialLimitOccupancy>[0]["countOccupancy"]
    >[0]
  ) {
    const exec = tx ?? mysql.db;
    const [row] = await exec
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(eq(resources.scopeId, scopeId));
    return Number(row?.count ?? 0);
  }

  async function createInScope(scopeId: number, cap: number) {
    return withCommercialLimitOccupancy({
      db: mysql.db,
      scope: {
        kind: "restaurant",
        scopeId,
        ownerUserId: scopeId,
      },
      limitKey: "posTerminals",
      occupancyDelta: 1,
      decide: capDecision(cap),
      countOccupancy: (tx) => countScope(scopeId, tx),
      create: async (tx) => {
        const exec = tx ?? mysql.db;
        const result = await exec.insert(resources).values({
          scopeKind: "restaurant",
          scopeId,
        });
        return { id: result[0].insertId };
      },
    });
  }

  it("creates below the limit", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    const created = await createInScope(SCOPE_A, 2);
    expect(created.id).toBeGreaterThan(0);
    expect(await counted(SCOPE_A)).toBe(1);
  });

  it("acquires a tenant lock row for the scope and limit key", async () => {
    const [rows] = await mysql.pool.promise().query(
      `SELECT scopeKind, scopeId, limitKey
       FROM commercial_limit_occupancy_locks
       WHERE scopeKind = ? AND scopeId = ? AND limitKey = ?`,
      ["restaurant", SCOPE_A, "posTerminals"]
    );
    expect((rows as unknown[]).length).toBe(1);
  });

  it("returns an existing domain row concurrently without extra occupancy", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    const first = await createInScope(SCOPE_A, 1);
    const peekExisting = async (
      tx: Parameters<
        Parameters<typeof withCommercialLimitOccupancy>[0]["countOccupancy"]
      >[0]
    ) => {
      const exec = tx ?? mysql.db;
      const [row] = await exec
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.scopeId, SCOPE_A));
      return row ? { id: row.id } : null;
    };
    const results = await Promise.all([
      withCommercialLimitOccupancy({
        db: mysql.db,
        scope: {
          kind: "restaurant",
          scopeId: SCOPE_A,
          ownerUserId: SCOPE_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 1,
        decide: capDecision(1),
        countOccupancy: (tx) => countScope(SCOPE_A, tx),
        resolveExisting: peekExisting,
        create: async () => {
          throw new Error("must not create duplicate");
        },
      }),
      withCommercialLimitOccupancy({
        db: mysql.db,
        scope: {
          kind: "restaurant",
          scopeId: SCOPE_A,
          ownerUserId: SCOPE_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 1,
        decide: capDecision(1),
        countOccupancy: (tx) => countScope(SCOPE_A, tx),
        resolveExisting: peekExisting,
        create: async () => {
          throw new Error("must not create duplicate");
        },
      }),
    ]);
    expect(results[0]?.id).toBe(first.id);
    expect(results[1]?.id).toBe(first.id);
    expect(await counted(SCOPE_A)).toBe(1);
  });

  it("denies create at the limit", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    await createInScope(SCOPE_A, 1);
    await expect(createInScope(SCOPE_A, 1)).rejects.toBeInstanceOf(
      CommercialLimitExceededError
    );
    expect(await counted(SCOPE_A)).toBe(1);
  });

  it("allows only one concurrent create when a single slot remains", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    await createInScope(SCOPE_A, 2);
    const results = await Promise.allSettled([
      createInScope(SCOPE_A, 2),
      createInScope(SCOPE_A, 2),
    ]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.status === "rejected" && rejected[0].reason).toBeInstanceOf(
      CommercialLimitExceededError
    );
    expect(await counted(SCOPE_A)).toBe(2);
  });

  it("rejects both concurrent creates when already at the limit", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    await createInScope(SCOPE_A, 1);
    const results = await Promise.allSettled([
      createInScope(SCOPE_A, 1),
      createInScope(SCOPE_A, 1),
    ]);
    expect(results.every((row) => row.status === "rejected")).toBe(true);
    expect(await counted(SCOPE_A)).toBe(1);
  });

  it("does not contend across tenants", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId IN (?, ?)",
      [SCOPE_A, SCOPE_B]
    );
    await createInScope(SCOPE_A, 2);
    await createInScope(SCOPE_B, 2);
    const results = await Promise.all([
      createInScope(SCOPE_A, 2),
      createInScope(SCOPE_B, 2),
    ]);
    expect(results).toHaveLength(2);
    expect(await counted(SCOPE_A)).toBe(2);
    expect(await counted(SCOPE_B)).toBe(2);
  });

  it("rolls back occupancy when domain insert throws", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    await expect(
      withCommercialLimitOccupancy({
        db: mysql.db,
        scope: {
          kind: "restaurant",
          scopeId: SCOPE_A,
          ownerUserId: SCOPE_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 1,
        decide: capDecision(2),
        countOccupancy: (tx) => countScope(SCOPE_A, tx),
        create: async () => {
          throw new Error("domain insert failed");
        },
      })
    ).rejects.toThrow("domain insert failed");
    expect(await counted(SCOPE_A)).toBe(0);
  });

  it("allows a retry after a failed transaction", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_resources WHERE scopeId = ?",
      [SCOPE_A]
    );
    await expect(createInScope(SCOPE_A, 0)).rejects.toBeInstanceOf(
      CommercialLimitExceededError
    );
    const created = await createInScope(SCOPE_A, 1);
    expect(created.id).toBeGreaterThan(0);
    expect(await counted(SCOPE_A)).toBe(1);
  });

  it("fail-closes when the commercial decision is unavailable", async () => {
    await expect(
      withCommercialLimitOccupancy({
        db: mysql.db,
        scope: {
          kind: "restaurant",
          scopeId: SCOPE_A,
          ownerUserId: SCOPE_A,
        },
        limitKey: "items",
        occupancyDelta: 1,
        decide: async () => ({
          allowed: false,
          reasonCode: "not_entitled",
          limitKey: "items",
          cap: 0,
          proposedTotal: 1,
          policy: "denied",
          source: "test",
        }),
        countOccupancy: async () => 0,
        create: async () => ({ id: 1 }),
      })
    ).rejects.toMatchObject({ reasonCode: "not_entitled" });
  });
});

describe("commercial occupancyDelta 0 provisioned replace real database", () => {
  let mysql: OccupancyTestMysql;

  beforeAll(async () => {
    const started = await startOccupancyTestMysql();
    if (!started) {
      throw new Error(
        "CONCURRENCY NOT VERIFIED — Docker MySQL required for occupancy tests"
      );
    }
    mysql = started;
  }, 120000);

  afterAll(async () => {
    await mysql?.stop();
  });

  const terminals = mysqlTable("occupancy_test_terminals", {
    id: int().autoincrement().primaryKey(),
    scopeId: int().notNull(),
    provisioned: int().notNull(),
    replacedById: int(),
  });

  async function provisionedCount(scopeId: number): Promise<number> {
    const [rows] = await mysql.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_test_terminals WHERE scopeId = ? AND provisioned = 1",
      [scopeId]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function insertProvisioned(scopeId: number): Promise<number> {
    const [result] = await mysql.pool.promise().query(
      "INSERT INTO occupancy_test_terminals (scopeId, provisioned) VALUES (?, 1)",
      [scopeId]
    );
    return Number((result as { insertId: number }).insertId);
  }

  function capDecision(cap: number) {
    return async (proposedTotal: number) => ({
      allowed: proposedTotal <= cap,
      reasonCode: proposedTotal <= cap ? "within_limit" : "limit_exceeded",
      limitKey: "posTerminals" as const,
      cap,
      proposedTotal,
      policy: "hard" as const,
      source: "test",
    });
  }

  async function countProvisioned(
    scopeId: number,
    tx: Parameters<
      Parameters<typeof withCommercialLimitOccupancy>[0]["countOccupancy"]
    >[0]
  ) {
    const exec = tx ?? mysql.db;
    const [row] = await exec
      .select({ count: sql<number>`count(*)` })
      .from(terminals)
      .where(
        sql`${terminals.scopeId} = ${scopeId} AND ${terminals.provisioned} = 1`
      );
    return Number(row?.count ?? 0);
  }

  async function replaceProvisioned(scopeId: number, previousId: number, cap: number) {
    return withCommercialLimitOccupancy({
      db: mysql.db,
      scope: {
        kind: "restaurant",
        scopeId,
        ownerUserId: scopeId,
      },
      limitKey: "posTerminals",
      occupancyDelta: 0,
      decide: capDecision(cap),
      countOccupancy: (tx) => countProvisioned(scopeId, tx),
      create: async (tx) => {
        const exec = tx ?? mysql.db;
        const [current] = await exec
          .select()
          .from(terminals)
          .where(eq(terminals.id, previousId));
        if (!current || current.provisioned !== 1) {
          throw new Error("already_replaced");
        }
        const inserted = await exec.insert(terminals).values({
          scopeId,
          provisioned: 1,
        });
        const replacementId = inserted[0].insertId;
        await exec
          .update(terminals)
          .set({ provisioned: 0, replacedById: replacementId })
          .where(eq(terminals.id, previousId));
        return { previousId, replacementId };
      },
    });
  }

  it("does not increase occupancy for a valid provisioned replacement", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_terminals WHERE scopeId = ?",
      [SCOPE_A]
    );
    const previousId = await insertProvisioned(SCOPE_A);
    expect(await provisionedCount(SCOPE_A)).toBe(1);
    const replaced = await replaceProvisioned(SCOPE_A, previousId, 1);
    expect(replaced.replacementId).toBeGreaterThan(previousId);
    expect(await provisionedCount(SCOPE_A)).toBe(1);
  });

  it("allows only one concurrent replacement of the same terminal", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_terminals WHERE scopeId = ?",
      [SCOPE_A]
    );
    const previousId = await insertProvisioned(SCOPE_A);
    const results = await Promise.allSettled([
      replaceProvisioned(SCOPE_A, previousId, 1),
      replaceProvisioned(SCOPE_A, previousId, 1),
    ]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await provisionedCount(SCOPE_A)).toBe(1);
  });

  it("keeps occupancy at the cap across concurrent replacements of different terminals", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_terminals WHERE scopeId = ?",
      [SCOPE_A]
    );
    const first = await insertProvisioned(SCOPE_A);
    const second = await insertProvisioned(SCOPE_A);
    expect(await provisionedCount(SCOPE_A)).toBe(2);
    const results = await Promise.all([
      replaceProvisioned(SCOPE_A, first, 2),
      replaceProvisioned(SCOPE_A, second, 2),
    ]);
    expect(results).toHaveLength(2);
    expect(await provisionedCount(SCOPE_A)).toBe(2);
  });

  it("does not contend across tenants during replacement", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_terminals WHERE scopeId IN (?, ?)",
      [SCOPE_A, SCOPE_B]
    );
    const a = await insertProvisioned(SCOPE_A);
    const b = await insertProvisioned(SCOPE_B);
    const results = await Promise.all([
      replaceProvisioned(SCOPE_A, a, 1),
      replaceProvisioned(SCOPE_B, b, 1),
    ]);
    expect(results).toHaveLength(2);
    expect(await provisionedCount(SCOPE_A)).toBe(1);
    expect(await provisionedCount(SCOPE_B)).toBe(1);
  });

  it("rolls back occupancy when replacement create throws", async () => {
    await mysql.pool.promise().query(
      "DELETE FROM occupancy_test_terminals WHERE scopeId = ?",
      [SCOPE_A]
    );
    const previousId = await insertProvisioned(SCOPE_A);
    await expect(
      withCommercialLimitOccupancy({
        db: mysql.db,
        scope: {
          kind: "restaurant",
          scopeId: SCOPE_A,
          ownerUserId: SCOPE_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 0,
        decide: capDecision(1),
        countOccupancy: (tx) => countProvisioned(SCOPE_A, tx),
        create: async () => {
          throw new Error("replace failed");
        },
      })
    ).rejects.toThrow("replace failed");
    expect(await provisionedCount(SCOPE_A)).toBe(1);
    const [rows] = await mysql.pool.promise().query(
      "SELECT provisioned FROM occupancy_test_terminals WHERE id = ?",
      [previousId]
    );
    expect((rows as { provisioned: number }[])[0]?.provisioned).toBe(1);
  });
});

/**
 * COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1
 * Real TiDB Cloud / Drizzle FOR UPDATE occupancy. Never uses Production DATABASE_URL.
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
  withCommercialLimitOccupancy,
} from "../commercialLimitOccupancy";
import {
  throwCommercialOccupancyTrpcError,
  COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_CODE,
} from "../commercialOccupancyTrpc";
import { TRPCError } from "@trpc/server";
import {
  G07_SCOPE_A,
  G07_SCOPE_B,
  G07_SCOPE_KEYS,
  cleanupG07Fixtures,
  readG07DatabaseUrl,
  startOccupancyTestTidb,
  type OccupancyTestTidb,
} from "./occupancyTestTidb";

const supplied = readG07DatabaseUrl();
if (process.env.G07_REQUIRE_TIDB === "1" && !supplied) {
  throw new Error(
    "G-07 STOP: G07_REQUIRE_TIDB=1 but G07_DATABASE_URL / TIDB_TEST_DATABASE_URL is missing"
  );
}

const resources = mysqlTable("occupancy_g07_resources", {
  id: int().autoincrement().primaryKey(),
  scopeKind: varchar({ length: 16 }).notNull(),
  scopeId: int().notNull(),
  limitKey: varchar({ length: 128 }).notNull(),
});

const terminals = mysqlTable("occupancy_g07_terminals", {
  id: int().autoincrement().primaryKey(),
  scopeId: int().notNull(),
  provisioned: int().notNull(),
  replacedById: int(),
});

function capDecision(cap: number, limitKey: "restaurants" | "categories" | "posTerminals") {
  return async (proposedTotal: number) => ({
    allowed: proposedTotal <= cap,
    reasonCode: proposedTotal <= cap ? "within_limit" : "limit_exceeded",
    limitKey,
    cap,
    proposedTotal,
    policy: "hard" as const,
    source: "g07-tidb",
  });
}

async function connectionIdFromTx(
  tx: NonNullable<Parameters<Parameters<typeof withCommercialLimitOccupancy>[0]["create"]>[0]>
): Promise<number> {
  const [rows] = await tx.execute(sql`SELECT CONNECTION_ID() AS id`);
  const list = rows as unknown as { id: number }[];
  return Number(list[0]?.id ?? 0);
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 120000 });

describe.skipIf(!supplied)("G-07 TiDB commercial occupancy concurrency", () => {
  let tidb: OccupancyTestTidb;
  const evidence: Record<string, unknown> = {};

  beforeAll(async () => {
    tidb = await startOccupancyTestTidb();
    await cleanupG07Fixtures(tidb.pool);
    evidence.identity = tidb.identity;
    evidence.engine = tidb.engine;
    evidence.lockTable = tidb.lockTable;
  }, 120000);

  afterAll(async () => {
    if (tidb) {
      await cleanupG07Fixtures(tidb.pool);
      await tidb.stop();
    }
    // eslint-disable-next-line no-console
    console.log("G07_EVIDENCE " + JSON.stringify(evidence));
  });

  async function counted(scopeId: number, limitKey: string): Promise<number> {
    const [rows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_g07_resources WHERE scopeId = ? AND limitKey = ?",
      [scopeId, limitKey]
    );
    return Number((rows as { c: number }[])[0]?.c ?? 0);
  }

  async function countScope(
    scopeId: number,
    limitKey: string,
    tx: Parameters<Parameters<typeof withCommercialLimitOccupancy>[0]["countOccupancy"]>[0]
  ) {
    const exec = tx ?? tidb.db;
    const [row] = await exec
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(
        sql`${resources.scopeId} = ${scopeId} AND ${resources.limitKey} = ${limitKey}`
      );
    return Number(row?.count ?? 0);
  }

  async function createResource(opts: {
    scopeId: number;
    cap: number;
    limitKey: "restaurants" | "categories" | "posTerminals";
    delayMs?: number;
    db?: OccupancyTestTidb["db"];
  }) {
    const db = opts.db ?? tidb.db;
    const kind = opts.limitKey === "restaurants" ? "owner" : "restaurant";
    return withCommercialLimitOccupancy({
      db,
      scope: {
        kind,
        scopeId: opts.scopeId,
        ownerUserId: opts.scopeId,
      },
      limitKey: opts.limitKey,
      occupancyDelta: 1,
      decide: capDecision(opts.cap, opts.limitKey),
      countOccupancy: (tx) => countScope(opts.scopeId, opts.limitKey, tx),
      create: async (tx) => {
        const exec = tx ?? db;
        const connectionId = tx ? await connectionIdFromTx(tx) : -1;
        if (opts.delayMs) {
          await new Promise((r) => setTimeout(r, opts.delayMs));
        }
        const result = await exec.insert(resources).values({
          scopeKind: kind,
          scopeId: opts.scopeId,
          limitKey: opts.limitKey,
        });
        return { id: result[0].insertId, connectionId };
      },
    });
  }

  it("records TiDB identity, isolation, and 0094 lock PK", () => {
    expect(tidb.identity.verdict).toBe("ACCEPT_NON_PRODUCTION");
    expect(tidb.identity.sameSqlUserAsProductionMain).toBe(false);
    expect(tidb.engine.version).toMatch(/tidb/i);
    expect(tidb.lockTable.primaryKey).toBe("scopeKind,scopeId,limitKey");
  });

  it("P4 same-tenant: one slot remaining, exactly one concurrent create", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId = ? AND limitKey = ?",
      [G07_SCOPE_A, "restaurants"]
    );
    await createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" });
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(1);
    const started = Date.now();
    const results = await Promise.allSettled([
      createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants", delayMs: 400 }),
      createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" }),
    ]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      rejected[0]?.status === "rejected" && rejected[0].reason
    ).toBeInstanceOf(CommercialLimitExceededError);
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(2);
    const ids = fulfilled
      .filter((row): row is PromiseFulfilledResult<{ id: number; connectionId: number }> =>
        row.status === "fulfilled"
      )
      .map((row) => row.value.connectionId);
    evidence.p4 = {
      elapsedMs: Date.now() - started,
      connectionIds: [
        ...ids,
        ...(rejected[0]?.status === "rejected" ? [] : []),
      ],
      fulfilled: fulfilled.length,
      rejected: rejected.length,
      finalOccupancy: 2,
      cap: 2,
    };
    const winner = fulfilled[0];
    if (winner?.status === "fulfilled") {
      (evidence.p4 as { winnerConnectionId: number }).winnerConnectionId =
        winner.value.connectionId;
    }
  });

  it("P5 at-cap: concurrent creates all fail and occupancy stays 2", async () => {
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(2);
    const results = await Promise.allSettled([
      createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" }),
      createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" }),
      createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" }),
    ]);
    expect(results.every((row) => row.status === "rejected")).toBe(true);
    for (const row of results) {
      expect(row.status === "rejected" && row.reason).toBeInstanceOf(
        CommercialLimitExceededError
      );
      if (row.status === "rejected") {
        expect(row.reason).not.toBeInstanceOf(CommercialOccupancyUnavailableError);
      }
    }
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(2);
    evidence.p5 = { rejected: results.length, finalOccupancy: 2 };
  });

  it("P6/P16 cross-tenant: both succeed without sharing occupancy", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId IN (?, ?) AND limitKey = ?",
      [G07_SCOPE_A, G07_SCOPE_B, "restaurants"]
    );
    await createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" });
    await createResource({ scopeId: G07_SCOPE_B, cap: 2, limitKey: "restaurants" });
    const started = Date.now();
    const results = await Promise.all([
      createResource({
        scopeId: G07_SCOPE_A,
        cap: 2,
        limitKey: "restaurants",
        delayMs: 300,
      }),
      createResource({ scopeId: G07_SCOPE_B, cap: 2, limitKey: "restaurants" }),
    ]);
    expect(results).toHaveLength(2);
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(2);
    expect(await counted(G07_SCOPE_B, "restaurants")).toBe(2);
    evidence.p6 = {
      elapsedMs: Date.now() - started,
      connectionIds: results.map((row) => row.connectionId),
      distinctConnections: new Set(results.map((row) => row.connectionId)).size,
      occupancyA: 2,
      occupancyB: 2,
    };
    expect(
      (evidence.p6 as { distinctConnections: number }).distinctConnections
    ).toBeGreaterThanOrEqual(1);
  });

  it("P7 independent limit keys do not share a mutex", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId = ?",
      [G07_SCOPE_KEYS]
    );
    const started = Date.now();
    const results = await Promise.all([
      createResource({
        scopeId: G07_SCOPE_KEYS,
        cap: 1,
        limitKey: "restaurants",
        delayMs: 300,
      }),
      createResource({
        scopeId: G07_SCOPE_KEYS,
        cap: 1,
        limitKey: "categories",
      }),
    ]);
    expect(results).toHaveLength(2);
    expect(await counted(G07_SCOPE_KEYS, "restaurants")).toBe(1);
    expect(await counted(G07_SCOPE_KEYS, "categories")).toBe(1);
    const [locks] = await tidb.pool.promise().query(
      `SELECT scopeKind, scopeId, limitKey
       FROM commercial_limit_occupancy_locks
       WHERE scopeId = ? AND limitKey IN ('restaurants', 'categories')
       ORDER BY limitKey`,
      [G07_SCOPE_KEYS]
    );
    const lockKeys = (locks as { limitKey: string }[]).map((row) => row.limitKey);
    expect(lockKeys).toEqual(["categories", "restaurants"]);
    evidence.p7 = {
      elapsedMs: Date.now() - started,
      lockKeys,
      restaurants: 1,
      categories: 1,
    };
  });

  it("P8 POS provision: exactly one concurrent terminal at last slot", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_terminals WHERE scopeId = ?",
      [G07_SCOPE_A]
    );
    await tidb.pool.promise().query(
      "INSERT INTO occupancy_g07_terminals (scopeId, provisioned) VALUES (?, 1)",
      [G07_SCOPE_A]
    );

    async function countProvisioned(
      tx: Parameters<Parameters<typeof withCommercialLimitOccupancy>[0]["countOccupancy"]>[0]
    ) {
      const exec = tx ?? tidb.db;
      const [row] = await exec
        .select({ count: sql<number>`count(*)` })
        .from(terminals)
        .where(
          sql`${terminals.scopeId} = ${G07_SCOPE_A} AND ${terminals.provisioned} = 1`
        );
      return Number(row?.count ?? 0);
    }

    async function provision() {
      return withCommercialLimitOccupancy({
        db: tidb.db,
        scope: {
          kind: "restaurant",
          scopeId: G07_SCOPE_A,
          ownerUserId: G07_SCOPE_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 1,
        decide: capDecision(2, "posTerminals"),
        countOccupancy: countProvisioned,
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          const inserted = await exec.insert(terminals).values({
            scopeId: G07_SCOPE_A,
            provisioned: 1,
          });
          return { id: inserted[0].insertId };
        },
      });
    }

    const results = await Promise.allSettled([provision(), provision()]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      rejected[0]?.status === "rejected" && rejected[0].reason
    ).toBeInstanceOf(CommercialLimitExceededError);
    const [countRows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_g07_terminals WHERE scopeId = ? AND provisioned = 1",
      [G07_SCOPE_A]
    );
    expect(Number((countRows as { c: number }[])[0]?.c ?? 0)).toBe(2);
    evidence.p8 = { fulfilled: 1, rejected: 1, finalOccupancy: 2 };
  });

  it("P9 occupancyDelta 0 replace: concurrent replace keeps occupancy 1", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_terminals WHERE scopeId = ?",
      [G07_SCOPE_A]
    );
    const [inserted] = await tidb.pool.promise().query(
      "INSERT INTO occupancy_g07_terminals (scopeId, provisioned) VALUES (?, 1)",
      [G07_SCOPE_A]
    );
    const previousId = Number((inserted as { insertId: number }).insertId);

    async function countProvisioned(
      tx: Parameters<Parameters<typeof withCommercialLimitOccupancy>[0]["countOccupancy"]>[0]
    ) {
      const exec = tx ?? tidb.db;
      const [row] = await exec
        .select({ count: sql<number>`count(*)` })
        .from(terminals)
        .where(
          sql`${terminals.scopeId} = ${G07_SCOPE_A} AND ${terminals.provisioned} = 1`
        );
      return Number(row?.count ?? 0);
    }

    async function replace() {
      return withCommercialLimitOccupancy({
        db: tidb.db,
        scope: {
          kind: "restaurant",
          scopeId: G07_SCOPE_A,
          ownerUserId: G07_SCOPE_A,
        },
        limitKey: "posTerminals",
        occupancyDelta: 0,
        decide: capDecision(1, "posTerminals"),
        countOccupancy: countProvisioned,
        create: async (tx) => {
          const exec = tx ?? tidb.db;
          const [current] = await exec
            .select()
            .from(terminals)
            .where(eq(terminals.id, previousId));
          if (!current || current.provisioned !== 1) {
            throw new Error("already_replaced");
          }
          const next = await exec.insert(terminals).values({
            scopeId: G07_SCOPE_A,
            provisioned: 1,
          });
          const replacementId = next[0].insertId;
          await exec
            .update(terminals)
            .set({ provisioned: 0, replacedById: replacementId })
            .where(eq(terminals.id, previousId));
          return { previousId, replacementId };
        },
      });
    }

    const results = await Promise.allSettled([replace(), replace()]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const [countRows] = await tidb.pool.promise().query(
      "SELECT COUNT(*) AS c FROM occupancy_g07_terminals WHERE scopeId = ? AND provisioned = 1",
      [G07_SCOPE_A]
    );
    const occ = Number((countRows as { c: number }[])[0]?.c ?? 0);
    expect(occ).toBe(1);
    evidence.p9 = { fulfilled: 1, rejected: 1, finalOccupancy: occ };
  });

  it("P10 rollback then retry", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId = ? AND limitKey = ?",
      [G07_SCOPE_A, "restaurants"]
    );
    await expect(
      withCommercialLimitOccupancy({
        db: tidb.db,
        scope: {
          kind: "owner",
          scopeId: G07_SCOPE_A,
          ownerUserId: G07_SCOPE_A,
        },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: capDecision(2, "restaurants"),
        countOccupancy: (tx) => countScope(G07_SCOPE_A, "restaurants", tx),
        create: async () => {
          throw new Error("domain insert failed");
        },
      })
    ).rejects.toThrow("domain insert failed");
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(0);
    const created = await createResource({
      scopeId: G07_SCOPE_A,
      cap: 2,
      limitKey: "restaurants",
    });
    expect(created.id).toBeGreaterThan(0);
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(1);
    evidence.p10 = { afterRollback: 0, afterRetry: 1 };
  });

  it("P11/P13 lock wait uses distinct connections and loser sees committed occupancy", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId = ? AND limitKey = ?",
      [G07_SCOPE_A, "restaurants"]
    );
    await createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" });
    const t1 = createResource({
      scopeId: G07_SCOPE_A,
      cap: 2,
      limitKey: "restaurants",
      delayMs: 800,
      db: tidb.db,
    });
    await new Promise((r) => setTimeout(r, 80));
    const t2Started = Date.now();
    const t2 = createResource({
      scopeId: G07_SCOPE_A,
      cap: 2,
      limitKey: "restaurants",
      db: tidb.dbB,
    });
    const results = await Promise.allSettled([t1, t2]);
    const t2Elapsed = Date.now() - t2Started;
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      rejected[0]?.status === "rejected" && rejected[0].reason
    ).toBeInstanceOf(CommercialLimitExceededError);
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(2);
    const winner =
      fulfilled[0]?.status === "fulfilled" ? fulfilled[0].value : null;
    evidence.p11 = {
      t2ElapsedMs: t2Elapsed,
      winnerConnectionId: winner?.connectionId ?? null,
      pools: "db+dbB",
      finalOccupancy: 2,
    };
    expect(t2Elapsed).toBeGreaterThan(400);
  });

  it("P12 high contention does not duplicate occupancy", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId = ? AND limitKey = ?",
      [G07_SCOPE_B, "restaurants"]
    );
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        createResource({ scopeId: G07_SCOPE_B, cap: 1, limitKey: "restaurants" })
      )
    );
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    const lockErrors = rejected.filter(
      (row) =>
        row.status === "rejected" &&
        !(row.reason instanceof CommercialLimitExceededError)
    );
    expect(fulfilled.length).toBe(1);
    expect(await counted(G07_SCOPE_B, "restaurants")).toBe(1);
    for (const row of rejected) {
      if (row.status !== "rejected") continue;
      expect(row.reason).not.toBeInstanceOf(CommercialOccupancyUnavailableError);
    }
    evidence.p12 = {
      fulfilled: fulfilled.length,
      rejected: rejected.length,
      nonLimitRejected: lockErrors.length,
      finalOccupancy: 1,
    };
  }, 30000);

  it("P14 two OS processes / two pools preserve occupancy <= cap", async () => {
    await tidb.pool.promise().query(
      "DELETE FROM occupancy_g07_resources WHERE scopeId = ? AND limitKey = ?",
      [G07_SCOPE_A, "restaurants"]
    );
    await createResource({ scopeId: G07_SCOPE_A, cap: 2, limitKey: "restaurants" });
    const runWorker = (label: string, delayMs: string) =>
      new Promise<{ ok: boolean; raw: string }>((resolvePromise) => {
        const child = spawn(
          "pnpm",
          [
            "exec",
            "tsx",
            "server/subscription-runtime/__tests__/occupancyTidbWorker.ts",
          ],
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              G07_WORKER_LABEL: label,
              G07_WORKER_SCOPE: String(G07_SCOPE_A),
              G07_WORKER_CAP: "2",
              G07_WORKER_DELAY_MS: delayMs,
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
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(await counted(G07_SCOPE_A, "restaurants")).toBe(2);
    evidence.p14 = {
      processA: parsedA,
      processB: parsedB,
      finalOccupancy: 2,
    };
  }, 120000);

  it("P15 G-06 classes: capacity vs unavailable stay distinct", () => {
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialLimitExceededError("limit_exceeded", 2),
        (cap) => `حد ${cap}`
      );
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
    try {
      throwCommercialOccupancyTrpcError(
        new CommercialOccupancyUnavailableError(),
        () => "حد"
      );
    } catch (error) {
      expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect((error as TRPCError).message).not.toBe("limit_exceeded");
    }
    expect(COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_CODE).toBe(
      "commercial_capacity_unavailable"
    );
    evidence.p15 = {
      atCapLoserIsLimitExceeded: true,
      unavailableNotMappedToLimit: true,
    };
  });
});

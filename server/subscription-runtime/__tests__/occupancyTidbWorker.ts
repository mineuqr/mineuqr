/**
 * COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1
 * Independent process worker. Uses G07_DATABASE_URL only.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { withCommercialLimitOccupancy } from "../commercialLimitOccupancy";
import {
  G07_SCOPE_A,
  startOccupancyTestTidb,
} from "./occupancyTestTidb";

const resources = mysqlTable("occupancy_g07_resources", {
  id: int().autoincrement().primaryKey(),
  scopeKind: varchar({ length: 16 }).notNull(),
  scopeId: int().notNull(),
  limitKey: varchar({ length: 128 }).notNull(),
});

const scopeId = Number(process.env.G07_WORKER_SCOPE ?? G07_SCOPE_A);
const cap = Number(process.env.G07_WORKER_CAP ?? 2);
const delayMs = Number(process.env.G07_WORKER_DELAY_MS ?? 0);
const label = process.env.G07_WORKER_LABEL ?? "worker";

function capDecision(limit: number) {
  return async (proposedTotal: number) => ({
    allowed: proposedTotal <= limit,
    reasonCode: proposedTotal <= limit ? "within_limit" : "limit_exceeded",
    limitKey: "restaurants" as const,
    cap: limit,
    proposedTotal,
    policy: "hard" as const,
    source: "g07-worker",
  });
}

async function main(): Promise<void> {
  const tidb = await startOccupancyTestTidb();
  const startedAt = Date.now();
  let connectionId: number | null = null;
  try {
    const result = await withCommercialLimitOccupancy({
      db: tidb.db,
      scope: {
        kind: "owner",
        scopeId,
        ownerUserId: scopeId,
      },
      limitKey: "restaurants",
      occupancyDelta: 1,
      decide: capDecision(cap),
      countOccupancy: async (tx) => {
        const exec = tx ?? tidb.db;
        const [row] = await exec
          .select({ count: sql<number>`count(*)` })
          .from(resources)
          .where(
            sql`${resources.scopeId} = ${scopeId} AND ${resources.limitKey} = ${"restaurants"}`
          );
        return Number(row?.count ?? 0);
      },
      create: async (tx) => {
        const exec = tx ?? tidb.db;
        const [cid] = await exec.execute(sql`SELECT CONNECTION_ID() AS id`);
        const rows = cid as unknown as { id: number }[];
        connectionId = Number(rows[0]?.id ?? 0);
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
        const inserted = await exec.insert(resources).values({
          scopeKind: "owner",
          scopeId,
          limitKey: "restaurants",
        });
        return { id: inserted[0].insertId, connectionId };
      },
    });
    console.log(
      JSON.stringify({
        ok: true,
        label,
        id: result.id,
        connectionId: result.connectionId ?? connectionId,
        elapsedMs: Date.now() - startedAt,
      })
    );
  } catch (error) {
    const err = error as {
      name?: string;
      code?: string;
      message?: string;
      errno?: number;
    };
    console.log(
      JSON.stringify({
        ok: false,
        label,
        name: err.name ?? "Error",
        code: err.code ?? null,
        errno: err.errno ?? null,
        message: err.message ?? String(error),
        connectionId,
        elapsedMs: Date.now() - startedAt,
      })
    );
    await tidb.stop();
    process.exitCode = 1;
    process.exit();
  }
  await tidb.stop();
}

void main();

/**
 * COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1
 * Tenant-scoped occupancy serialization. Cap remains checkLimit.
 * Occupancy remains caller COUNT(*). This module is not a second limiter.
 */

import { sql } from "drizzle-orm";
import { getDb } from "../db";
import type { LimitDecision } from "./enforcement";

type OccupancyDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type CommercialOccupancyTx = Parameters<
  Parameters<OccupancyDb["transaction"]>[0]
>[0];

export type CommercialOccupancyScope =
  | { kind: "owner"; scopeId: number; ownerUserId: number }
  | { kind: "restaurant"; scopeId: number; ownerUserId: number };

export class CommercialLimitExceededError extends Error {
  readonly code = "COMMERCIAL_LIMIT_EXCEEDED";
  readonly reasonCode: string;
  readonly cap: number | null;
  constructor(reasonCode: string, cap: number | null) {
    super(`Commercial limit exceeded (${reasonCode})`);
    this.name = "CommercialLimitExceededError";
    this.reasonCode = reasonCode;
    this.cap = cap;
  }
}

export class CommercialOccupancyUnavailableError extends Error {
  readonly code = "COMMERCIAL_OCCUPANCY_UNAVAILABLE";
  constructor(message = "commercial_occupancy_unavailable") {
    super(message);
    this.name = "CommercialOccupancyUnavailableError";
  }
}

const ER_LOCK_DEADLOCK = 1213;
const ER_LOCK_WAIT_TIMEOUT = 1205;
const MAX_LOCK_RETRIES = 3;

function mysqlErrno(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { errno?: number; cause?: unknown };
  if (typeof candidate.errno === "number") return candidate.errno;
  if (candidate.cause) return mysqlErrno(candidate.cause);
  return null;
}

function isRetryableLockError(error: unknown): boolean {
  const errno = mysqlErrno(error);
  if (errno === ER_LOCK_DEADLOCK || errno === ER_LOCK_WAIT_TIMEOUT) return true;
  const code = (error as { code?: string } | null)?.code;
  return code === "ER_LOCK_DEADLOCK" || code === "ER_LOCK_WAIT_TIMEOUT";
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type WithCommercialLimitOccupancyInput<T> = {
  scope: CommercialOccupancyScope;
  limitKey: "restaurants" | "categories" | "items" | "posTerminals";
  /** 1 = consume a slot. 0 = serialize without consuming a new slot. */
  occupancyDelta?: 0 | 1;
  decide: (proposedTotal: number) => Promise<LimitDecision>;
  countOccupancy: (tx: CommercialOccupancyTx | null) => Promise<number>;
  /**
   * Domain-owned idempotency peek after the tenant lock is held.
   * Returning a value skips COUNT / decide / create (no occupancy consumed).
   */
  resolveExisting?: (tx: CommercialOccupancyTx | null) => Promise<T | null>;
  create: (tx: CommercialOccupancyTx | null) => Promise<T>;
  /** Injected database (tests). Production uses getDb(). */
  db?: OccupancyDb | null;
  now?: Date;
};

function useUnlockedTestPath(explicitDb?: OccupancyDb | null): boolean {
  return process.env.NODE_ENV === "test" && explicitDb == null;
}

/**
 * Commit the mutex row before the occupancy transaction.
 * TiDB SELECT FOR UPDATE locks the latest *committed* version, not an
 * uncommitted INSERT in the same transaction. Creating the row inside the
 * occupancy race does not serialize (G-07).
 */
async function ensureCommittedLockRow(
  db: OccupancyDb,
  scopeKind: string,
  scopeId: number,
  limitKey: string
): Promise<void> {
  await db.execute(sql`
    INSERT IGNORE INTO commercial_limit_occupancy_locks (scopeKind, scopeId, limitKey)
    VALUES (${scopeKind}, ${scopeId}, ${limitKey})
  `);
}

async function acquireExistingLock(
  tx: CommercialOccupancyTx,
  scopeKind: string,
  scopeId: number,
  limitKey: string
): Promise<void> {
  await tx.execute(sql`
    SELECT scopeKind
    FROM commercial_limit_occupancy_locks
    WHERE scopeKind = ${scopeKind}
      AND scopeId = ${scopeId}
      AND limitKey = ${limitKey}
    FOR UPDATE
  `);
}

/**
 * occupancyDelta 0 serializes a non-increasing mutation (POS replace).
 * A hard limit_exceeded on proposedTotal === current occupancy is not a
 * new-capacity denial. NONE / unsupported / denied still fail closed.
 */
function isNewCapacityDenial(
  decision: LimitDecision,
  occupancyDelta: 0 | 1
): boolean {
  if (decision.allowed) return false;
  if (
    occupancyDelta === 0 &&
    decision.policy === "hard" &&
    decision.reasonCode === "limit_exceeded"
  ) {
    return false;
  }
  return true;
}

async function runLocked<T>(
  db: OccupancyDb,
  input: WithCommercialLimitOccupancyInput<T>
): Promise<T> {
  const delta = input.occupancyDelta ?? 1;
  await ensureCommittedLockRow(
    db,
    input.scope.kind,
    input.scope.scopeId,
    input.limitKey
  );
  // READ COMMITTED: caller COUNT(*) is a current read on TiDB.
  // REPEATABLE-READ snapshot COUNT stays stale after waiting on FOR UPDATE (G-07).
  return db.transaction(
    async (tx) => {
      await acquireExistingLock(
        tx,
        input.scope.kind,
        input.scope.scopeId,
        input.limitKey
      );
      if (input.resolveExisting) {
        const existing = await input.resolveExisting(tx);
        if (existing != null) return existing;
      }
      const occupancy = await input.countOccupancy(tx);
      const proposedTotal = occupancy + delta;
      const decision = await input.decide(proposedTotal);
      if (isNewCapacityDenial(decision, delta)) {
        throw new CommercialLimitExceededError(
          decision.reasonCode,
          decision.cap ?? 0
        );
      }
      return input.create(tx);
    },
    { isolationLevel: "read committed" }
  );
}

async function runUnlocked<T>(
  input: WithCommercialLimitOccupancyInput<T>
): Promise<T> {
  const delta = input.occupancyDelta ?? 1;
  if (input.resolveExisting) {
    const existing = await input.resolveExisting(null);
    if (existing != null) return existing;
  }
  const occupancy = await input.countOccupancy(null);
  const decision = await input.decide(occupancy + delta);
  if (isNewCapacityDenial(decision, delta)) {
    throw new CommercialLimitExceededError(
      decision.reasonCode,
      decision.cap ?? 0
    );
  }
  return input.create(null);
}

/**
 * Serialize a tenant-scoped commercial quantity mutation.
 * Domain create stays in `create`. Commercial only decides capacity.
 */
export async function withCommercialLimitOccupancy<T>(
  input: WithCommercialLimitOccupancyInput<T>
): Promise<T> {
  if (useUnlockedTestPath(input.db)) {
    return runUnlocked(input);
  }

  const db = input.db === undefined ? await getDb() : input.db;
  if (!db) {
    throw new CommercialOccupancyUnavailableError();
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_LOCK_RETRIES; attempt++) {
    try {
      return await runLocked(db, input);
    } catch (error) {
      if (error instanceof CommercialLimitExceededError) throw error;
      lastError = error;
      if (!isRetryableLockError(error) || attempt === MAX_LOCK_RETRIES) {
        throw error;
      }
      await sleep(25 * attempt);
    }
  }
  throw lastError;
}

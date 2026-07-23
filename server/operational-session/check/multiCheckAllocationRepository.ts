/**
 * MULTI-CHECK-ALLOCATION-PERSISTENCE-1 — Multi Check Allocation repository.
 *
 * Storage / retrieval / mapping / concurrency / append-only history only.
 * MUST NOT evaluate lifecycle, calculate money, or enforce Domain invariants.
 *
 * Concurrency:
 * - Unique allocationId / allocationReference / portionId / adjustmentId / reversalId.
 * - Header updates use compare-and-set on `version` (`expectedVersion`).
 * - Optional `SessionDbClient` joins caller Check-owned transactions
 *   (repos never open/commit independent transactions).
 *
 * History is append-only audit — never update/delete history rows.
 * Children (sources/portions/adjustments/reversals) are insert-if-absent by
 * canonical id; portion `applied` may be finalized true→true idempotently.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import {
  multiCheckAllocationAdjustments,
  multiCheckAllocationHistory,
  multiCheckAllocationPortions,
  multiCheckAllocationReversals,
  multiCheckAllocations,
  multiCheckAllocationSources,
  type SelectMultiCheckAllocationAdjustment,
  type SelectMultiCheckAllocationPortion,
  type SelectMultiCheckAllocationReversal,
  type SelectMultiCheckAllocationSource,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type { MultiCheckAllocation } from "@shared/operational-session";
import {
  getAllocationPersistenceMetadata,
  mapRowToAllocationHistory,
  mapRowsToMultiCheckAllocation,
  toAllocationAdjustmentInsertValues,
  toAllocationHistoryInsertValues,
  toAllocationPortionInsertValues,
  toAllocationReversalInsertValues,
  toAllocationSourceInsertValues,
  toMultiCheckAllocationInsertValues,
  toMultiCheckAllocationUpdateValues,
  type AllocationHistoryRecord,
  type AllocationMutationType,
} from "./multiCheckAllocationMapper";

export class MultiCheckAllocationPersistenceError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT" | "DUPLICATE" | "UNAVAILABLE";

  constructor(
    code: MultiCheckAllocationPersistenceError["code"],
    message: string
  ) {
    super(message);
    this.name = "MultiCheckAllocationPersistenceError";
    this.code = code;
  }
}

export type MultiCheckAllocationLoadResult = Readonly<{
  allocation: MultiCheckAllocation;
  version: number;
  schemaVersion: number;
  allocationReason: string | null;
}>;

export type PersistMultiCheckAllocationOptions = Readonly<{
  expectedVersion: number;
  mutationType?: AllocationMutationType;
  allocationReason?: string | null;
  targetCheckId?: number | null;
}>;

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

function isMysqlDuplicateKeyError(error: unknown): boolean {
  const e = error as { code?: string | number; errno?: number; message?: string };
  return (
    e?.code === "ER_DUP_ENTRY" ||
    e?.errno === 1062 ||
    (typeof e?.message === "string" && e.message.includes("Duplicate"))
  );
}

async function loadChildren(
  db: SessionDbClient,
  allocationId: string
): Promise<{
  sources: SelectMultiCheckAllocationSource[];
  portions: SelectMultiCheckAllocationPortion[];
  adjustments: SelectMultiCheckAllocationAdjustment[];
  reversals: SelectMultiCheckAllocationReversal[];
}> {
  const [sources, portions, adjustments, reversals] = await Promise.all([
    db
      .select()
      .from(multiCheckAllocationSources)
      .where(eq(multiCheckAllocationSources.allocationId, allocationId)),
    db
      .select()
      .from(multiCheckAllocationPortions)
      .where(eq(multiCheckAllocationPortions.allocationId, allocationId)),
    db
      .select()
      .from(multiCheckAllocationAdjustments)
      .where(eq(multiCheckAllocationAdjustments.allocationId, allocationId)),
    db
      .select()
      .from(multiCheckAllocationReversals)
      .where(eq(multiCheckAllocationReversals.allocationId, allocationId)),
  ]);
  return { sources, portions, adjustments, reversals };
}

async function appendHistory(
  db: SessionDbClient,
  input: {
    allocation: MultiCheckAllocation;
    previousRevision: number;
    newRevision: number;
    mutationType: AllocationMutationType;
    allocationReason?: string | null;
    targetCheckId?: number | null;
  }
): Promise<void> {
  await db.insert(multiCheckAllocationHistory).values(
    toAllocationHistoryInsertValues({
      allocation: input.allocation,
      previousRevision: input.previousRevision,
      newRevision: input.newRevision,
      mutationType: input.mutationType,
      allocationReason: input.allocationReason ?? null,
      targetCheckId: input.targetCheckId ?? null,
      createdAt: input.allocation.updatedAt,
    })
  );
}

/**
 * Append-only children sync. Never deletes.
 * Portion applied flag may be finalized to true (idempotent).
 */
async function syncChildren(
  db: SessionDbClient,
  allocation: MultiCheckAllocation
): Promise<void> {
  for (const source of allocation.sources) {
    try {
      await db.insert(multiCheckAllocationSources).values(
        toAllocationSourceInsertValues(
          allocation,
          source,
          allocation.createdAt
        )
      );
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
    }
  }

  for (const portion of allocation.portions) {
    try {
      await db
        .insert(multiCheckAllocationPortions)
        .values(toAllocationPortionInsertValues(allocation, portion));
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
      if (portion.applied) {
        await db
          .update(multiCheckAllocationPortions)
          .set({ applied: true })
          .where(
            and(
              eq(multiCheckAllocationPortions.portionId, portion.portionId),
              eq(multiCheckAllocationPortions.allocationId, allocation.allocationId),
              eq(multiCheckAllocationPortions.applied, false)
            )
          );
      }
    }
  }

  for (const adjustment of allocation.adjustments) {
    try {
      await db
        .insert(multiCheckAllocationAdjustments)
        .values(toAllocationAdjustmentInsertValues(allocation, adjustment));
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
    }
  }

  for (const reversal of allocation.reversals) {
    try {
      await db
        .insert(multiCheckAllocationReversals)
        .values(toAllocationReversalInsertValues(allocation, reversal));
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
    }
  }
}

export async function insertMultiCheckAllocation(
  allocation: MultiCheckAllocation,
  options?: {
    allocationReason?: string | null;
    mutationType?: AllocationMutationType;
    targetCheckId?: number | null;
  },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  try {
    const result = await db.insert(multiCheckAllocations).values(
      toMultiCheckAllocationInsertValues(allocation, {
        version: 1,
        allocationReason: options?.allocationReason ?? null,
      })
    );
    const insertId = Number(result[0].insertId);
    if (!Number.isFinite(insertId) || insertId <= 0) {
      throw new DiningSessionUnavailableError(
        "multi_check_allocations insert did not return an id"
      );
    }
    await syncChildren(db, allocation);
    await appendHistory(db, {
      allocation,
      previousRevision: 0,
      newRevision: 1,
      mutationType: options?.mutationType ?? "create",
      allocationReason: options?.allocationReason ?? null,
      targetCheckId: options?.targetCheckId ?? null,
    });
    return insertId;
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      throw new MultiCheckAllocationPersistenceError(
        "DUPLICATE",
        `MultiCheckAllocation already persisted for allocationId=${allocation.allocationId}`
      );
    }
    throw error;
  }
}

export async function findMultiCheckAllocationByIdentity(
  input: {
    restaurantId: number;
    allocationId: string;
  },
  client?: SessionDbClient
): Promise<MultiCheckAllocationLoadResult | null> {
  const db = await resolveDb(client);
  const [header] = await db
    .select()
    .from(multiCheckAllocations)
    .where(
      and(
        eq(multiCheckAllocations.restaurantId, input.restaurantId),
        eq(multiCheckAllocations.allocationId, input.allocationId)
      )
    )
    .limit(1);
  if (!header) return null;
  const children = await loadChildren(db, header.allocationId);
  const meta = getAllocationPersistenceMetadata(header);
  return {
    allocation: mapRowsToMultiCheckAllocation(
      header,
      children.sources,
      children.portions,
      children.adjustments,
      children.reversals
    ),
    version: meta.version,
    schemaVersion: meta.schemaVersion,
    allocationReason: meta.allocationReason,
  };
}

export async function existsMultiCheckAllocation(
  input: {
    restaurantId: number;
    allocationId: string;
  },
  client?: SessionDbClient
): Promise<boolean> {
  const found = await findMultiCheckAllocationByIdentity(input, client);
  return found != null;
}

export async function listMultiCheckAllocationsForSourceCheck(
  input: { restaurantId: number; sourceCheckId: number },
  client?: SessionDbClient
): Promise<MultiCheckAllocationLoadResult[]> {
  const db = await resolveDb(client);
  const headers = await db
    .select()
    .from(multiCheckAllocations)
    .where(
      and(
        eq(multiCheckAllocations.restaurantId, input.restaurantId),
        eq(multiCheckAllocations.sourceCheckId, input.sourceCheckId)
      )
    );
  if (headers.length === 0) return [];

  const allocationIds = headers.map((h) => h.allocationId);
  const [sources, portions, adjustments, reversals] = await Promise.all([
    db
      .select()
      .from(multiCheckAllocationSources)
      .where(inArray(multiCheckAllocationSources.allocationId, allocationIds)),
    db
      .select()
      .from(multiCheckAllocationPortions)
      .where(inArray(multiCheckAllocationPortions.allocationId, allocationIds)),
    db
      .select()
      .from(multiCheckAllocationAdjustments)
      .where(
        inArray(multiCheckAllocationAdjustments.allocationId, allocationIds)
      ),
    db
      .select()
      .from(multiCheckAllocationReversals)
      .where(
        inArray(multiCheckAllocationReversals.allocationId, allocationIds)
      ),
  ]);

  return headers.map((header) => {
    const meta = getAllocationPersistenceMetadata(header);
    return {
      allocation: mapRowsToMultiCheckAllocation(
        header,
        sources.filter((s) => s.allocationId === header.allocationId),
        portions.filter((p) => p.allocationId === header.allocationId),
        adjustments.filter((a) => a.allocationId === header.allocationId),
        reversals.filter((r) => r.allocationId === header.allocationId)
      ),
      version: meta.version,
      schemaVersion: meta.schemaVersion,
      allocationReason: meta.allocationReason,
    };
  });
}

export async function listMultiCheckAllocationsForTargetCheck(
  input: { restaurantId: number; targetCheckId: number },
  client?: SessionDbClient
): Promise<MultiCheckAllocationLoadResult[]> {
  const db = await resolveDb(client);
  const portionRows = await db
    .select()
    .from(multiCheckAllocationPortions)
    .where(
      and(
        eq(multiCheckAllocationPortions.restaurantId, input.restaurantId),
        eq(multiCheckAllocationPortions.targetCheckId, input.targetCheckId)
      )
    );
  const allocationIds = [
    ...new Set(portionRows.map((p) => p.allocationId)),
  ];
  if (allocationIds.length === 0) return [];

  const results: MultiCheckAllocationLoadResult[] = [];
  for (const allocationId of allocationIds) {
    const found = await findMultiCheckAllocationByIdentity(
      { restaurantId: input.restaurantId, allocationId },
      client
    );
    if (found) results.push(found);
  }
  return results;
}

/**
 * Persist Allocation Domain snapshot with optimistic concurrency on `version`.
 * Child facts are append-only (insert-if-absent by canonical id).
 * Always appends an audit history row (previousRevision → newRevision).
 */
export async function updateMultiCheckAllocation(
  allocation: MultiCheckAllocation,
  options: PersistMultiCheckAllocationOptions,
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const nextVersion = options.expectedVersion + 1;
  const result = await db
    .update(multiCheckAllocations)
    .set(
      toMultiCheckAllocationUpdateValues(
        allocation,
        nextVersion,
        options.allocationReason ?? null
      )
    )
    .where(
      and(
        eq(multiCheckAllocations.restaurantId, allocation.restaurantId),
        eq(multiCheckAllocations.allocationId, allocation.allocationId),
        eq(multiCheckAllocations.version, options.expectedVersion)
      )
    );

  const affected = Number(
    (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
  if (affected === 0) {
    const existing = await findMultiCheckAllocationByIdentity(
      {
        restaurantId: allocation.restaurantId,
        allocationId: allocation.allocationId,
      },
      client
    );
    if (!existing) {
      throw new MultiCheckAllocationPersistenceError(
        "NOT_FOUND",
        `MultiCheckAllocation not found for allocationId=${allocation.allocationId}`
      );
    }
    throw new MultiCheckAllocationPersistenceError(
      "CONFLICT",
      `MultiCheckAllocation concurrency conflict: expected version ${options.expectedVersion}, found ${existing.version}`
    );
  }

  await syncChildren(db, allocation);
  await appendHistory(db, {
    allocation,
    previousRevision: options.expectedVersion,
    newRevision: nextVersion,
    mutationType: options.mutationType ?? "update",
    allocationReason: options.allocationReason ?? null,
    targetCheckId: options.targetCheckId ?? null,
  });
  return nextVersion;
}

/** Alias — persist current Domain snapshot with version CAS + history append. */
export async function persistMultiCheckAllocation(
  allocation: MultiCheckAllocation,
  options: PersistMultiCheckAllocationOptions,
  client?: SessionDbClient
): Promise<number> {
  return updateMultiCheckAllocation(allocation, options, client);
}

// ─── Allocation History Repository (append-only) ────────────────

export async function listAllocationHistory(
  input: { restaurantId: number; allocationId: string },
  client?: SessionDbClient
): Promise<AllocationHistoryRecord[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(multiCheckAllocationHistory)
    .where(
      and(
        eq(multiCheckAllocationHistory.restaurantId, input.restaurantId),
        eq(multiCheckAllocationHistory.allocationId, input.allocationId)
      )
    )
    .orderBy(asc(multiCheckAllocationHistory.id));
  return rows.map(mapRowToAllocationHistory);
}

export async function appendAllocationHistoryRecord(
  input: {
    allocation: MultiCheckAllocation;
    previousRevision: number;
    newRevision: number;
    mutationType: AllocationMutationType;
    allocationReason?: string | null;
    targetCheckId?: number | null;
  },
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  await appendHistory(db, input);
}

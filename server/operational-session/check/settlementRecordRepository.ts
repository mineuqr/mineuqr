/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — Settlement Record repository.
 *
 * Append-only persistence. Insert + retrieval only.
 * MUST NOT UPDATE money fields. MUST NOT DELETE historical records.
 * Unique (restaurantId, checkId, recordKind, recordGeneration) → SR-INV-05.
 */

import { and, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import {
  settlementRecords,
  type SelectSettlementRecord,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type {
  SettlementRecord,
  SettlementRecordIdentity,
  SettlementRecordKind,
} from "@shared/operational-session";
import { assertAppendOnly } from "@shared/operational-session";
import {
  mapRowToSettlementRecord,
  toSettlementRecordInsertValues,
} from "./settlementRecordMapper";

export type SettlementRecordListQuery = Readonly<{
  restaurantId: number;
  /** Inclusive YYYY-MM-DD (businessDay) or ISO date prefix. */
  dateFrom?: string | null;
  dateTo?: string | null;
  /** Matches settlementRecordId, financialReference, checkId, sessionId. */
  search?: string | null;
  outcome?: string | null;
  recordKind?: SettlementRecordKind | null;
  page?: number;
  pageSize?: number;
}>;

export type SettlementRecordListPage = Readonly<{
  records: SettlementRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
}>;

export class SettlementRecordPersistenceError extends Error {
  readonly code: "NOT_FOUND" | "DUPLICATE" | "UNAVAILABLE" | "IMMUTABLE";

  constructor(
    code: SettlementRecordPersistenceError["code"],
    message: string
  ) {
    super(message);
    this.name = "SettlementRecordPersistenceError";
    this.code = code;
  }
}

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

export type SettlementRecordRow = SelectSettlementRecord;

/**
 * Insert immutable Settlement Record. Duplicate business key → DUPLICATE
 * (callers treat as already_applied / idempotent retry).
 */
export async function insertSettlementRecord(
  record: SettlementRecord,
  client?: SessionDbClient
): Promise<number> {
  assertAppendOnly("insert");
  const db = await resolveDb(client);
  try {
    const result = await db
      .insert(settlementRecords)
      .values(toSettlementRecordInsertValues(record));
    const insertId = Number(result[0].insertId);
    if (!Number.isFinite(insertId) || insertId <= 0) {
      throw new DiningSessionUnavailableError(
        "settlement_records insert did not return an id"
      );
    }
    return insertId;
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      throw new SettlementRecordPersistenceError(
        "DUPLICATE",
        `Settlement Record already persisted for check=${record.checkId} kind=${record.recordKind} gen=${record.recordGeneration}`
      );
    }
    throw error;
  }
}

export async function findSettlementRecordById(
  input: { restaurantId: number; settlementRecordId: string },
  client?: SessionDbClient
): Promise<SettlementRecord | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(settlementRecords)
    .where(
      and(
        eq(settlementRecords.restaurantId, input.restaurantId),
        eq(settlementRecords.settlementRecordId, input.settlementRecordId)
      )
    )
    .limit(1);
  return row ? mapRowToSettlementRecord(row) : null;
}

export async function findSettlementRecordByIdentity(
  input: SettlementRecordIdentity,
  client?: SessionDbClient
): Promise<SettlementRecord | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(settlementRecords)
    .where(
      and(
        eq(settlementRecords.restaurantId, input.restaurantId),
        eq(settlementRecords.checkId, input.checkId),
        eq(settlementRecords.recordKind, input.recordKind),
        eq(settlementRecords.recordGeneration, input.recordGeneration)
      )
    )
    .limit(1);
  return row ? mapRowToSettlementRecord(row) : null;
}

export async function existsSettlementRecord(
  input: SettlementRecordIdentity,
  client?: SessionDbClient
): Promise<boolean> {
  const found = await findSettlementRecordByIdentity(input, client);
  return found != null;
}

export async function listSettlementRecordsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<SettlementRecord[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(settlementRecords)
    .where(
      and(
        eq(settlementRecords.restaurantId, input.restaurantId),
        eq(settlementRecords.checkId, input.checkId)
      )
    );
  return rows.map(mapRowToSettlementRecord);
}

export async function listSettlementRecordsForRestaurant(
  input: { restaurantId: number },
  client?: SessionDbClient
): Promise<SettlementRecord[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(settlementRecords)
    .where(eq(settlementRecords.restaurantId, input.restaurantId));
  return rows.map(mapRowToSettlementRecord);
}

export async function listSettlementRecordsForSession(
  input: { restaurantId: number; sessionId: number },
  client?: SessionDbClient
): Promise<SettlementRecord[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(settlementRecords)
    .where(
      and(
        eq(settlementRecords.restaurantId, input.restaurantId),
        eq(settlementRecords.sessionId, input.sessionId)
      )
    );
  return rows.map(mapRowToSettlementRecord);
}

function buildRestaurantListFilters(input: SettlementRecordListQuery): SQL[] {
  const filters: SQL[] = [eq(settlementRecords.restaurantId, input.restaurantId)];

  if (input.dateFrom && /^\d{4}-\d{2}-\d{2}/.test(input.dateFrom)) {
    filters.push(gte(settlementRecords.businessDay, input.dateFrom.slice(0, 10)));
  }
  if (input.dateTo && /^\d{4}-\d{2}-\d{2}/.test(input.dateTo)) {
    filters.push(lte(settlementRecords.businessDay, input.dateTo.slice(0, 10)));
  }
  if (input.outcome) {
    filters.push(
      eq(
        settlementRecords.outcome,
        input.outcome as "paid" | "complimentary" | "voided"
      )
    );
  }
  if (input.recordKind) {
    filters.push(eq(settlementRecords.recordKind, input.recordKind));
  }

  const search = input.search?.trim();
  if (search) {
    const likePat = `%${search}%`;
    const searchOr = or(
      like(settlementRecords.settlementRecordId, likePat),
      like(settlementRecords.financialReference, likePat),
      sql`CAST(${settlementRecords.checkId} AS CHAR) LIKE ${likePat}`,
      sql`CAST(${settlementRecords.sessionId} AS CHAR) LIKE ${likePat}`
    );
    if (searchOr) filters.push(searchOr);
  }

  return filters;
}

/**
 * Tenant-scoped Settlement History — newest first, filterable, paginated.
 * Restaurant isolation is mandatory (SR-INV-07).
 */
export async function listSettlementRecordsForRestaurantPaged(
  input: SettlementRecordListQuery,
  client?: SessionDbClient
): Promise<SettlementRecordListPage> {
  const db = await resolveDb(client);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const where = and(...buildRestaurantListFilters(input));

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(settlementRecords)
    .where(where);
  const totalCount = Number(countRow?.count ?? 0);

  const rows = await db
    .select()
    .from(settlementRecords)
    .where(where)
    .orderBy(
      desc(settlementRecords.settledAt),
      desc(settlementRecords.createdAt),
      desc(settlementRecords.id)
    )
    .limit(pageSize)
    .offset(offset);

  return {
    records: rows.map(mapRowToSettlementRecord),
    totalCount,
    page,
    pageSize,
  };
}

/**
 * Explicitly unsupported — SR-INV-02. Corrections use compensating inserts.
 */
export async function updateSettlementRecord(): Promise<never> {
  assertAppendOnly("update");
  throw new SettlementRecordPersistenceError(
    "IMMUTABLE",
    "SR-INV-02: Settlement Record UPDATE is forbidden"
  );
}

export async function deleteSettlementRecord(): Promise<never> {
  assertAppendOnly("delete");
  throw new SettlementRecordPersistenceError(
    "IMMUTABLE",
    "SR-INV-02: Settlement Record DELETE is forbidden"
  );
}

export type { SettlementRecordKind };

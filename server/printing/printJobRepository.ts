/**
 * THERMAL-PRINTING-3B.2 / 3C.1 — print_jobs persistence boundary.
 */
import { and, asc, desc, eq, isNull, isNotNull, or, sql } from "drizzle-orm";
import {
  printJobs,
  type InsertPrintJob,
  type SelectPrintJob,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { readMysqlAffectedRows } from "../db/mysqlAffectedRows";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import {
  PrintJobUnavailableError,
  type ClaimJobData,
  type FindNextQueuedJobFilter,
  type InsertPrintJobData,
} from "./printJobTypes";

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type PrintJobDbClient = DbClient | Parameters<Parameters<DbClient["transaction"]>[0]>[0];

async function resolveDb(client?: PrintJobDbClient): Promise<PrintJobDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
}

function buildQueuedJobWhere(filter: FindNextQueuedJobFilter) {
  const conditions = [eq(printJobs.status, PRINT_JOB_STATUS.QUEUED)];

  if (filter.printerId != null) {
    conditions.push(
      or(eq(printJobs.printerId, filter.printerId), isNull(printJobs.printerId))!
    );
  }

  return and(...conditions);
}

export async function findNextQueuedJob(
  filter: FindNextQueuedJobFilter = {},
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(printJobs)
    .where(buildQueuedJobWhere(filter))
    .orderBy(asc(printJobs.createdAt))
    .limit(1)
    .for("update", { skipLocked: true });

  return row ?? null;
}

export async function claimJob(
  data: ClaimJobData,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const result = await db
    .update(printJobs)
    .set({
      status: PRINT_JOB_STATUS.CLAIMED,
      claimedBy: data.workerId,
      leaseExpiresAt: data.leaseExpiresAt,
    })
    .where(
      and(eq(printJobs.id, data.jobId), eq(printJobs.status, PRINT_JOB_STATUS.QUEUED))
    );

  if (readMysqlAffectedRows(result) === 0) {
    return null;
  }

  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, data.jobId)).limit(1);
  return row ?? null;
}

export async function findPrintJobByIdempotencyKey(
  idempotencyKey: string
): Promise<SelectPrintJob | null> {
  const db = await resolveDb();
  const [row] = await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.idempotencyKey, idempotencyKey))
    .limit(1);

  return row ?? null;
}

export async function findPrintJobById(
  id: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1);
  return row ?? null;
}

export type ListPrintJobsForRestaurantInput = {
  restaurantId: number;
  limit: number;
  offset: number;
  printerId?: number;
};

export type ListPrintJobsForRestaurantResult = {
  jobs: SelectPrintJob[];
  total: number;
};

export async function listPrintJobsForRestaurant(
  input: ListPrintJobsForRestaurantInput,
  client?: PrintJobDbClient
): Promise<ListPrintJobsForRestaurantResult> {
  const db = await resolveDb(client);
  const conditions = [eq(printJobs.restaurantId, input.restaurantId)];
  if (input.printerId != null) {
    conditions.push(eq(printJobs.printerId, input.printerId));
  }
  const where = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(printJobs)
    .where(where);
  const total = Number(countRow?.count ?? 0);

  const jobs = await db
    .select()
    .from(printJobs)
    .where(where)
    .orderBy(desc(printJobs.createdAt))
    .limit(input.limit)
    .offset(input.offset);

  return { jobs, total };
}

export async function countPrintJobsByStatusForRestaurant(
  restaurantId: number,
  client?: PrintJobDbClient
): Promise<Record<string, number>> {
  const db = await resolveDb(client);
  const rows = await db
    .select({
      status: printJobs.status,
      count: sql<number>`count(*)`,
    })
    .from(printJobs)
    .where(eq(printJobs.restaurantId, restaurantId))
    .groupBy(printJobs.status);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

export async function findLatestPrintJobForPrinter(
  printerId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.printerId, printerId))
    .orderBy(desc(printJobs.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function insertPrintJob(data: InsertPrintJobData): Promise<number> {
  const db = await resolveDb();
  const values: InsertPrintJob = {
    restaurantId: data.restaurantId,
    orderId: data.orderId,
    idempotencyKey: data.idempotencyKey,
    status: PRINT_JOB_STATUS.QUEUED,
    attemptCount: 0,
  };

  if (data.printerId != null) {
    values.printerId = data.printerId;
  }
  if (data.stationId !== undefined) {
    values.stationId = data.stationId;
  }

  const result = await db.insert(printJobs).values(values);
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new PrintJobUnavailableError("print_jobs insert did not return an id");
  }
  return insertId;
}

export async function markJobPrinting(
  jobId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const result = await db
    .update(printJobs)
    .set({
      status: PRINT_JOB_STATUS.PRINTING,
      attemptCount: sql`${printJobs.attemptCount} + 1`,
    })
    .where(
      and(
        eq(printJobs.id, jobId),
        eq(printJobs.status, PRINT_JOB_STATUS.CLAIMED),
        isNotNull(printJobs.claimedBy)
      )
    );

  if (readMysqlAffectedRows(result) === 0) {
    return null;
  }

  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  return row ?? null;
}

export async function markJobPrinted(
  jobId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const result = await db
    .update(printJobs)
    .set({ status: PRINT_JOB_STATUS.PRINTED })
    .where(and(eq(printJobs.id, jobId), eq(printJobs.status, PRINT_JOB_STATUS.PRINTING)));

  if (readMysqlAffectedRows(result) === 0) {
    return null;
  }

  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  return row ?? null;
}

export async function markJobFailed(
  jobId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const result = await db
    .update(printJobs)
    .set({ status: PRINT_JOB_STATUS.FAILED })
    .where(and(eq(printJobs.id, jobId), eq(printJobs.status, PRINT_JOB_STATUS.PRINTING)));

  if (readMysqlAffectedRows(result) === 0) {
    return null;
  }

  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  return row ?? null;
}

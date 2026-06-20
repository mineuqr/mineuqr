/**
 * THERMAL-PRINTING-3B.2 / 3C.1 — print_jobs persistence boundary.
 */
import { and, asc, eq, isNull, or } from "drizzle-orm";
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

export async function findPrintJobById(id: number): Promise<SelectPrintJob | null> {
  const db = await resolveDb();
  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1);
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

  const result = await db.insert(printJobs).values(values);
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new PrintJobUnavailableError("print_jobs insert did not return an id");
  }
  return insertId;
}

/**
 * THERMAL-PRINTING-3B.2 — print_jobs persistence boundary.
 */
import { eq } from "drizzle-orm";
import {
  printJobs,
  type InsertPrintJob,
  type SelectPrintJob,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { PrintJobUnavailableError } from "./printJobTypes";
import type { InsertPrintJobData } from "./printJobTypes";

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function resolveDb(): Promise<DbClient> {
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
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

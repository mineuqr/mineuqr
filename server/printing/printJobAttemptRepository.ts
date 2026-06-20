/**
 * THERMAL-PRINTING-3C.2 — print_job_attempts persistence boundary.
 */
import { eq } from "drizzle-orm";
import {
  printJobAttempts,
  type InsertPrintJobAttempt,
  type SelectPrintJobAttempt,
} from "../../drizzle/schema";
import type { PrintExecutionAttemptMetadata } from "../../shared/printing/types";
import { getDb } from "../db";
import { PrintJobUnavailableError } from "./printJobTypes";
import type { PrintJobDbClient } from "./printJobRepository";

async function resolveDb(client?: PrintJobDbClient): Promise<PrintJobDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
}

export type InsertPrintAttemptData = {
  printJobId: number;
  eventType: string;
  metadataJson: PrintExecutionAttemptMetadata;
};

export async function insertPrintAttempt(
  data: InsertPrintAttemptData,
  client?: PrintJobDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const values: InsertPrintJobAttempt = {
    printJobId: data.printJobId,
    eventType: data.eventType,
    metadataJson: data.metadataJson,
  };

  const result = await db.insert(printJobAttempts).values(values);
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new PrintJobUnavailableError("print_job_attempts insert did not return an id");
  }
  return insertId;
}

export async function updatePrintAttemptMetadata(
  attemptId: number,
  metadataJson: PrintExecutionAttemptMetadata,
  client?: PrintJobDbClient
): Promise<void> {
  const db = await resolveDb(client);
  await db
    .update(printJobAttempts)
    .set({ metadataJson })
    .where(eq(printJobAttempts.id, attemptId));
}

export async function findPrintAttemptById(
  attemptId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJobAttempt | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(printJobAttempts)
    .where(eq(printJobAttempts.id, attemptId))
    .limit(1);
  return row ?? null;
}

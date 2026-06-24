/**
 * THERMAL-PRINTING-13I.6 — diagnostic print run persistence.
 */
import { desc, eq } from "drizzle-orm";
import {
  printDiagnosticRuns,
  type SelectPrintDiagnosticRun,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { PrintJobUnavailableError } from "./printJobTypes";
import type { DiagnosticPrintStatus } from "../../shared/printing/diagnosticPrint";

async function resolveDb() {
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
}

export async function insertPrintDiagnosticRun(input: {
  diagnosticId: string;
  restaurantId: number;
  printerId: number;
  triggeredByUserId: number;
  triggeredByLabel: string;
}): Promise<SelectPrintDiagnosticRun> {
  const db = await resolveDb();
  const [result] = await db.insert(printDiagnosticRuns).values({
    diagnosticId: input.diagnosticId,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    triggeredByUserId: input.triggeredByUserId,
    triggeredByLabel: input.triggeredByLabel,
    status: "pending",
  });
  const id = Number(result.insertId);
  const row = await findPrintDiagnosticRunById(id);
  if (!row) {
    throw new PrintJobUnavailableError();
  }
  return row;
}

export async function findPrintDiagnosticRunById(
  id: number
): Promise<SelectPrintDiagnosticRun | null> {
  const db = await resolveDb();
  const [row] = await db
    .select()
    .from(printDiagnosticRuns)
    .where(eq(printDiagnosticRuns.id, id))
    .limit(1);
  return row ?? null;
}

export async function findPrintDiagnosticRunByDiagnosticId(
  diagnosticId: string
): Promise<SelectPrintDiagnosticRun | null> {
  const db = await resolveDb();
  const [row] = await db
    .select()
    .from(printDiagnosticRuns)
    .where(eq(printDiagnosticRuns.diagnosticId, diagnosticId))
    .limit(1);
  return row ?? null;
}

export async function updatePrintDiagnosticRun(input: {
  id: number;
  status?: DiagnosticPrintStatus;
  agentId?: string | null;
  error?: string | null;
  completedAt?: string | null;
}): Promise<void> {
  const db = await resolveDb();
  await db
    .update(printDiagnosticRuns)
    .set({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
      ...(input.error !== undefined ? { error: input.error } : {}),
      ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
    })
    .where(eq(printDiagnosticRuns.id, input.id));
}

export async function listPrintDiagnosticRunsForRestaurant(input: {
  restaurantId: number;
  limit: number;
}): Promise<SelectPrintDiagnosticRun[]> {
  const db = await resolveDb();
  return db
    .select()
    .from(printDiagnosticRuns)
    .where(eq(printDiagnosticRuns.restaurantId, input.restaurantId))
    .orderBy(desc(printDiagnosticRuns.createdAt))
    .limit(input.limit);
}

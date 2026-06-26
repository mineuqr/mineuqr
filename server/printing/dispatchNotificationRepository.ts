/**
 * THERMAL-PRINTING-13I.3C.2 — durable dispatch notification persistence.
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { printJobs, type SelectPrintJob } from "../../drizzle/schema";
import { getDb } from "../db";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import type { PrintJobDbClient } from "./printJobRepository";
import { PrintJobUnavailableError } from "./printJobTypes";

async function resolveDb(client?: PrintJobDbClient): Promise<PrintJobDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
}

export type PendingDispatchNotification = {
  jobId: number;
  agentId: string;
  assignedAt: string;
  restaurantId: number;
  printerId: number;
  orderId: number;
};

export async function hasPersistedDispatchNotification(
  jobId: number,
  client?: PrintJobDbClient
): Promise<boolean> {
  const db = await resolveDb(client);
  const [row] = await db
    .select({ dispatchNotifiedAt: printJobs.dispatchNotifiedAt })
    .from(printJobs)
    .where(eq(printJobs.id, jobId))
    .limit(1);
  return row?.dispatchNotifiedAt != null;
}

export async function recordPersistedDispatchNotification(
  jobId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJob | null> {
  const db = await resolveDb(client);
  const notifiedAt = new Date().toISOString();
  await db
    .update(printJobs)
    .set({ dispatchNotifiedAt: notifiedAt })
    .where(and(eq(printJobs.id, jobId), isNull(printJobs.dispatchNotifiedAt)));

  const [row] = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  return row ?? null;
}

export async function listPendingDispatchNotifications(
  agentId?: string,
  client?: PrintJobDbClient
): Promise<PendingDispatchNotification[]> {
  const db = await resolveDb(client);
  const conditions = [
    eq(printJobs.status, PRINT_JOB_STATUS.ASSIGNED),
    isNotNull(printJobs.assignedAgentId),
    isNull(printJobs.dispatchNotifiedAt),
  ];
  if (agentId?.trim()) {
    conditions.push(eq(printJobs.assignedAgentId, agentId.trim()));
  }

  const rows = await db
    .select({
      id: printJobs.id,
      assignedAgentId: printJobs.assignedAgentId,
      assignedAt: printJobs.assignedAt,
      restaurantId: printJobs.restaurantId,
      printerId: printJobs.printerId,
      orderId: printJobs.orderId,
    })
    .from(printJobs)
    .where(and(...conditions));

  const pending: PendingDispatchNotification[] = [];
  for (const row of rows) {
    if (!row.assignedAgentId || row.printerId == null || !row.assignedAt) {
      continue;
    }
    pending.push({
      jobId: row.id,
      agentId: row.assignedAgentId,
      assignedAt: row.assignedAt,
      restaurantId: row.restaurantId,
      printerId: row.printerId,
      orderId: row.orderId,
    });
  }
  return pending;
}

export async function clearPersistedDispatchNotificationsForTests(
  jobIds: number[],
  client?: PrintJobDbClient
): Promise<void> {
  if (jobIds.length === 0) {
    return;
  }
  const db = await resolveDb(client);
  for (const jobId of jobIds) {
    await db
      .update(printJobs)
      .set({ dispatchNotifiedAt: null })
      .where(eq(printJobs.id, jobId));
  }
}

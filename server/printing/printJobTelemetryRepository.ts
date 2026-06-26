/**
 * THERMAL-PRINTING-13I.3C.3 — durable operational telemetry persistence.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  printJobTelemetryEvents,
  printJobs,
  type SelectPrintJobTelemetryEvent,
} from "../../drizzle/schema";
import type {
  PrintJobTelemetryEventType,
  PrintJobTelemetrySeverity,
} from "../../shared/printing/telemetry";
import { getDb } from "../db";
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

export type InsertPrintJobTelemetryEventData = {
  printJobId: number;
  correlationId: string;
  eventType: PrintJobTelemetryEventType;
  restaurantId: number;
  agentId?: string;
  printerId?: number;
  severity?: PrintJobTelemetrySeverity;
  payloadJson?: Record<string, unknown>;
};

export async function insertPrintJobTelemetryEvent(
  data: InsertPrintJobTelemetryEventData,
  client?: PrintJobDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const result = await db.insert(printJobTelemetryEvents).values({
    printJobId: data.printJobId,
    correlationId: data.correlationId,
    eventType: data.eventType,
    restaurantId: data.restaurantId,
    agentId: data.agentId,
    printerId: data.printerId,
    severity: data.severity ?? "info",
    payloadJson: data.payloadJson ?? null,
  });
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new PrintJobUnavailableError("print_job_telemetry_events insert did not return an id");
  }
  return insertId;
}

export async function listPrintJobTelemetryEvents(
  printJobId: number,
  client?: PrintJobDbClient
): Promise<SelectPrintJobTelemetryEvent[]> {
  const db = await resolveDb(client);
  return db
    .select()
    .from(printJobTelemetryEvents)
    .where(eq(printJobTelemetryEvents.printJobId, printJobId))
    .orderBy(asc(printJobTelemetryEvents.createdAt), asc(printJobTelemetryEvents.id));
}

export async function findPrintJobCorrelationId(
  printJobId: number,
  client?: PrintJobDbClient
): Promise<string | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select({ correlationId: printJobs.correlationId })
    .from(printJobs)
    .where(eq(printJobs.id, printJobId))
    .limit(1);
  return row?.correlationId ?? null;
}

export async function assignPrintJobCorrelationId(
  printJobId: number,
  correlationId: string,
  client?: PrintJobDbClient
): Promise<string> {
  const db = await resolveDb(client);
  await db
    .update(printJobs)
    .set({ correlationId })
    .where(and(eq(printJobs.id, printJobId), isNull(printJobs.correlationId)));

  const [row] = await db
    .select({ correlationId: printJobs.correlationId })
    .from(printJobs)
    .where(eq(printJobs.id, printJobId))
    .limit(1);

  if (row?.correlationId) {
    return row.correlationId;
  }

  const existing = await findPrintJobCorrelationId(printJobId, client);
  if (existing) {
    return existing;
  }

  throw new PrintJobUnavailableError("Unable to assign print job correlation id");
}

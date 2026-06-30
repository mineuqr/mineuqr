import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { printJobs } from "../../../../drizzle/schema";
import type {
  CreatePrintJobInput,
  PrintJobRecord,
  PrintJobRepository,
  UpdatePrintJobStatusInput,
} from "../../contracts/repositories/PrintJobRepository";
import type { PrintPayload } from "../../domain/PrintPayload";
import type { PrintJobSource, PrintJobStatus } from "../../domain/PrintJobStatus";

function mapRow(row: typeof printJobs.$inferSelect): PrintJobRecord {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    status: row.status as PrintJobStatus,
    source: row.source as PrintJobSource,
    idempotencyKey: row.idempotencyKey,
    triggerEventType: row.triggerEventType ?? null,
    triggerEventId: row.triggerEventId ?? null,
    correlationId: row.correlationId ?? null,
    payloadVersion: row.payloadVersion,
    payload: row.payloadJson as PrintPayload,
    attemptCount: row.attemptCount,
    lastError: row.lastError ?? null,
    operatorUserId: row.operatorUserId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dispatchedAt: row.dispatchedAt ?? null,
    printingAt: row.printingAt ?? null,
    completedAt: row.completedAt ?? null,
  };
}

export class DrizzlePrintJobRepository implements PrintJobRepository {
  async create(input: CreatePrintJobInput): Promise<PrintJobRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const result = await db.insert(printJobs).values({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      status: "pending",
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      triggerEventType: input.triggerEventType ?? null,
      triggerEventId: input.triggerEventId ?? null,
      correlationId: input.correlationId ?? null,
      payloadVersion: input.payload.schemaVersion,
      payloadJson: input.payload,
      operatorUserId: input.operatorUserId ?? null,
    });

    const insertId = Number(result[0].insertId);
    const created = await this.findById(insertId, input.restaurantId);
    if (!created) throw new Error("Failed to load created print job");
    return created;
  }

  async findById(jobId: number, restaurantId: number): Promise<PrintJobRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.id, jobId), eq(printJobs.restaurantId, restaurantId)))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async findByIdempotencyKey(
    restaurantId: number,
    idempotencyKey: string
  ): Promise<PrintJobRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(printJobs)
      .where(
        and(
          eq(printJobs.restaurantId, restaurantId),
          eq(printJobs.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async listByOrder(restaurantId: number, orderId: number): Promise<PrintJobRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(printJobs)
      .where(and(eq(printJobs.restaurantId, restaurantId), eq(printJobs.orderId, orderId)))
      .orderBy(desc(printJobs.createdAt));

    return rows.map(mapRow);
  }

  async updateStatus(input: UpdatePrintJobStatusInput): Promise<PrintJobRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const patch: Partial<typeof printJobs.$inferInsert> = {
      status: input.toStatus,
      lastError: input.lastError ?? null,
    };

    if (input.dispatchedAt !== undefined) patch.dispatchedAt = input.dispatchedAt;
    if (input.printingAt !== undefined) patch.printingAt = input.printingAt;
    if (input.completedAt !== undefined) patch.completedAt = input.completedAt;
    if (input.incrementAttempt) {
      const current = await this.findById(input.jobId, input.restaurantId);
      if (current) patch.attemptCount = current.attemptCount + 1;
    }

    await db
      .update(printJobs)
      .set(patch)
      .where(
        and(
          eq(printJobs.id, input.jobId),
          eq(printJobs.restaurantId, input.restaurantId),
          eq(printJobs.status, input.fromStatus)
        )
      );

    return this.findById(input.jobId, input.restaurantId);
  }
}

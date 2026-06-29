import { randomUUID } from "crypto";
import { and, asc, eq, lte, or, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { readMysqlAffectedRows } from "../../../../db/mysqlAffectedRows";
import {
  orderDomainOutbox,
  type InsertOrderDomainOutbox,
} from "../../../../../drizzle/schema";
import type {
  OutboxAppendInput,
  OutboxRepository,
} from "../contracts/EventInfrastructureContracts";
import type { EventEnvelope, StoredOutboxRecord } from "../EventEnvelope";
import { serializeDomainEventPayload } from "../serialization/domainEventSerializer";

type DbTx = Parameters<Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]>[0];

async function safeGetDb(): Promise<Awaited<ReturnType<typeof getDb>>> {
  try {
    return await getDb();
  } catch {
    return null;
  }
}

export class DrizzleOutboxRepository implements OutboxRepository {
  async appendInTransaction(
    tx: unknown,
    messages: OutboxAppendInput[]
  ): Promise<void> {
    const dbTx = tx as DbTx;
    if (messages.length === 0) return;

    const aggregateId = messages[0]!.envelope.aggregateId;
    const [seqRow] = await dbTx
      .select({
        maxSeq: sql<number>`COALESCE(MAX(${orderDomainOutbox.sequenceNumber}), 0)`,
      })
      .from(orderDomainOutbox)
      .where(eq(orderDomainOutbox.aggregateId, aggregateId));

    let nextSeq = Number(seqRow?.maxSeq ?? 0);

    const rows: InsertOrderDomainOutbox[] = messages.map((msg) => {
      nextSeq += 1;
      const env = msg.envelope;
      return {
        id: env.id,
        eventId: env.eventId,
        eventType: env.eventType,
        aggregateType: env.aggregateType,
        aggregateId: env.aggregateId,
        aggregateVersion: env.aggregateVersion,
        restaurantId: env.restaurantId,
        sequenceNumber: nextSeq,
        occurredAt: env.occurredAt,
        correlationId: env.correlationId,
        causationId: env.causationId,
        payloadVersion: env.payloadVersion,
        payload: serializeDomainEventPayload(env.payload as never),
        status: "pending",
        publishAttempts: 0,
      };
    });

    await dbTx.insert(orderDomainOutbox).values(rows);
  }

  async fetchPendingBatch(limit: number): Promise<StoredOutboxRecord[]> {
    const db = await safeGetDb();
    if (!db) return [];

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    const rows = await db
      .select()
      .from(orderDomainOutbox)
      .where(
        and(
          eq(orderDomainOutbox.status, "pending"),
          or(
            isNull(orderDomainOutbox.nextRetryAt),
            lte(orderDomainOutbox.nextRetryAt, now)
          )
        )
      )
      .orderBy(asc(orderDomainOutbox.occurredAt), asc(orderDomainOutbox.sequenceNumber))
      .limit(limit);

    return rows.map(mapRowToStored);
  }

  async markPublished(outboxId: string, publishedAt: string): Promise<boolean> {
    const db = await safeGetDb();
    if (!db) return false;

    const result = await db
      .update(orderDomainOutbox)
      .set({
        status: "published",
        publishedAt,
        lastError: null,
      })
      .where(
        and(
          eq(orderDomainOutbox.id, outboxId),
          eq(orderDomainOutbox.status, "pending")
        )
      );

    return readMysqlAffectedRows(result) > 0;
  }

  async markPublishFailed(
    outboxId: string,
    error: string,
    nextRetryAt: string | null,
    markDeadLetter: boolean
  ): Promise<void> {
    const db = await safeGetDb();
    if (!db) return;

    await db
      .update(orderDomainOutbox)
      .set({
        status: markDeadLetter ? "failed" : "pending",
        lastError: error.slice(0, 4000),
        nextRetryAt: markDeadLetter ? null : nextRetryAt,
        publishAttempts: sql`${orderDomainOutbox.publishAttempts} + 1`,
      })
      .where(eq(orderDomainOutbox.id, outboxId));
  }

  async countPending(): Promise<number> {
    const db = await safeGetDb();
    if (!db) return 0;
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orderDomainOutbox)
      .where(eq(orderDomainOutbox.status, "pending"));
    return Number(row?.count ?? 0);
  }
}

export class DrizzleEventStore {
  async getByAggregateId(aggregateId: number): Promise<EventEnvelope[]> {
    const db = await safeGetDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(orderDomainOutbox)
      .where(eq(orderDomainOutbox.aggregateId, aggregateId))
      .orderBy(asc(orderDomainOutbox.sequenceNumber));

    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      aggregateVersion: row.aggregateVersion,
      restaurantId: row.restaurantId,
      sequenceNumber: row.sequenceNumber,
      occurredAt: row.occurredAt,
      correlationId: row.correlationId,
      causationId: row.causationId,
      payloadVersion: row.payloadVersion,
      payload: JSON.parse(row.payload),
    }));
  }
}

function mapRowToStored(row: typeof orderDomainOutbox.$inferSelect): StoredOutboxRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    aggregateVersion: row.aggregateVersion,
    restaurantId: row.restaurantId,
    sequenceNumber: row.sequenceNumber,
    occurredAt: row.occurredAt,
    correlationId: row.correlationId,
    causationId: row.causationId,
    payloadVersion: row.payloadVersion,
    payload: JSON.parse(row.payload),
    status: row.status,
    publishAttempts: row.publishAttempts,
    lastError: row.lastError,
    publishedAt: row.publishedAt,
    nextRetryAt: row.nextRetryAt,
    createdAt: row.createdAt,
  };
}

export function newOutboxIds(): { id: string; eventId: string } {
  return { id: randomUUID(), eventId: randomUUID() };
}


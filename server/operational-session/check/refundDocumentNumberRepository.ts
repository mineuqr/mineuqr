/**
 * REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — RF- sequence allocation + lookup.
 * Identity plane only. No money arithmetic. No Settlement Record mutation.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import {
  refundDocumentNumbers,
  refundDocumentSequences,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

/**
 * Allocate next restaurant-scoped refund sequence and bind to Settlement Record id.
 * Idempotent: existing binding is returned unchanged (numbers never reused / reassigned).
 */
export async function allocateRefundDocumentNumber(
  input: {
    restaurantId: number;
    settlementRecordId: string;
  },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const existing = await findRefundDocumentSequenceByRecordId(
    {
      restaurantId: input.restaurantId,
      settlementRecordId: input.settlementRecordId,
    },
    client
  );
  if (existing != null) return existing;

  await db.execute(sql`
    INSERT INTO refund_document_sequences (restaurantId, lastNumber)
    VALUES (${input.restaurantId}, LAST_INSERT_ID(1))
    ON DUPLICATE KEY UPDATE lastNumber = LAST_INSERT_ID(lastNumber + 1)
  `);
  const [seqRow] = await db.execute(sql`SELECT LAST_INSERT_ID() AS n`);
  const sequenceNumber = Number((seqRow as { n: number }[])[0]?.n ?? 1);
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error("Failed to allocate refund document sequence");
  }

  try {
    await db.insert(refundDocumentNumbers).values({
      restaurantId: input.restaurantId,
      settlementRecordId: input.settlementRecordId,
      sequenceNumber,
    });
    return sequenceNumber;
  } catch (error) {
    const raced = await findRefundDocumentSequenceByRecordId(
      {
        restaurantId: input.restaurantId,
        settlementRecordId: input.settlementRecordId,
      },
      client
    );
    if (raced != null) return raced;
    throw error;
  }
}

export async function findRefundDocumentSequenceByRecordId(
  input: {
    restaurantId: number;
    settlementRecordId: string;
  },
  client?: SessionDbClient
): Promise<number | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select({ sequenceNumber: refundDocumentNumbers.sequenceNumber })
    .from(refundDocumentNumbers)
    .where(
      and(
        eq(refundDocumentNumbers.restaurantId, input.restaurantId),
        eq(
          refundDocumentNumbers.settlementRecordId,
          input.settlementRecordId
        )
      )
    )
    .limit(1);
  return row?.sequenceNumber ?? null;
}

export async function findSettlementRecordIdByRefundSequence(
  input: {
    restaurantId: number;
    sequenceNumber: number;
  },
  client?: SessionDbClient
): Promise<string | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select({ settlementRecordId: refundDocumentNumbers.settlementRecordId })
    .from(refundDocumentNumbers)
    .where(
      and(
        eq(refundDocumentNumbers.restaurantId, input.restaurantId),
        eq(refundDocumentNumbers.sequenceNumber, input.sequenceNumber)
      )
    )
    .limit(1);
  return row?.settlementRecordId ?? null;
}

export async function mapRefundDocumentSequencesByRecordIds(
  input: {
    restaurantId: number;
    settlementRecordIds: readonly string[];
  },
  client?: SessionDbClient
): Promise<ReadonlyMap<string, number>> {
  const ids = [...new Set(input.settlementRecordIds.filter(Boolean))];
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  const db = await resolveDb(client);
  const rows = await db
    .select({
      settlementRecordId: refundDocumentNumbers.settlementRecordId,
      sequenceNumber: refundDocumentNumbers.sequenceNumber,
    })
    .from(refundDocumentNumbers)
    .where(
      and(
        eq(refundDocumentNumbers.restaurantId, input.restaurantId),
        inArray(refundDocumentNumbers.settlementRecordId, ids)
      )
    );
  for (const row of rows) {
    out.set(row.settlementRecordId, row.sequenceNumber);
  }
  return out;
}

/** Ensure sequence table row exists (tests / warm-up). */
export async function ensureRefundDocumentSequenceRow(
  restaurantId: number,
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  await db
    .insert(refundDocumentSequences)
    .values({ restaurantId, lastNumber: 0 })
    .onDuplicateKeyUpdate({ set: { lastNumber: sql`lastNumber` } });
}

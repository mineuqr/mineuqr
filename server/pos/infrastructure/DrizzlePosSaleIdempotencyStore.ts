/**
 * POS-PERSISTENCE-WIRING-1
 * Production POS Sale idempotency persistence against pos_sale_idempotency (0093).
 * Database unique (restaurantId, terminalId, userId, idempotencyKey) is the authority.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { posSaleIdempotency } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type {
  PosSaleIdempotencyKey,
  PosSaleIdempotencyRecord,
  PosSaleIdempotencyStore,
} from "./PosSaleIdempotencyStore";
import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";
import { noteOrderLifecyclePhase } from "../../order/observability/orderLifecycleLatency";
import {
  POS_DATABASE_UNAVAILABLE,
  type LoadPosDb,
  PosSaleIdempotencyConflictError,
  PosSaleIdempotencyUniqueCollisionError,
  fromMysqlTimestampString,
  isMysqlDuplicateKeyError,
  toMysqlTimestampString,
} from "./posPersistenceErrors";

function mapRecord(
  row: typeof posSaleIdempotency.$inferSelect
): PosSaleIdempotencyRecord {
  return {
    restaurantId: row.restaurantId,
    terminalId: row.terminalId,
    userId: row.userId,
    idempotencyKey: row.idempotencyKey,
    fingerprint: row.fingerprint,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    trackingToken: row.trackingToken,
    displayReference: row.displayReference,
    totalAmount: row.totalAmount,
    itemCount: row.itemCount,
    checkId: row.checkId,
    subtotal: row.subtotal,
    taxAmount: row.taxAmount,
    grandTotal: row.grandTotal,
    billDiscountAmount: row.billDiscountAmount,
    lines: Array.isArray(row.linesJson) ? row.linesJson : [],
    createdAt: fromMysqlTimestampString(row.createdAt),
  };
}

export class DrizzlePosSaleIdempotencyStore implements PosSaleIdempotencyStore {
  private readonly tails = new Map<string, Promise<void>>();

  constructor(private readonly loadDb: LoadPosDb = getDb) {}

  private async requireDb() {
    const db = await this.loadDb();
    if (!db) throw new Error(POS_DATABASE_UNAVAILABLE);
    return db;
  }

  async get(input: PosSaleIdempotencyKey): Promise<PosSaleIdempotencyRecord | null> {
    const db = await this.requireDb();
    const [row] = await db
      .select()
      .from(posSaleIdempotency)
      .where(
        and(
          eq(posSaleIdempotency.restaurantId, input.restaurantId),
          eq(posSaleIdempotency.terminalId, input.terminalId),
          eq(posSaleIdempotency.userId, input.userId),
          eq(posSaleIdempotency.idempotencyKey, input.idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRecord(row) : null;
  }

  async put(record: PosSaleIdempotencyRecord): Promise<void> {
    const db = await this.requireDb();
    try {
      await db.insert(posSaleIdempotency).values({
        id: randomUUID(),
        restaurantId: record.restaurantId,
        terminalId: record.terminalId,
        userId: record.userId,
        idempotencyKey: record.idempotencyKey,
        fingerprint: record.fingerprint,
        orderId: record.orderId,
        orderNumber: record.orderNumber,
        trackingToken: record.trackingToken,
        displayReference: record.displayReference,
        totalAmount: record.totalAmount,
        itemCount: record.itemCount,
        checkId: record.checkId,
        subtotal: record.subtotal,
        taxAmount: record.taxAmount,
        grandTotal: record.grandTotal,
        billDiscountAmount: record.billDiscountAmount,
        linesJson: record.lines,
        createdAt: toMysqlTimestampString(record.createdAt),
      });
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
      const existing = await this.get(record);
      if (!existing) throw error;
      if (existing.fingerprint !== record.fingerprint) {
        throw new PosSaleIdempotencyConflictError();
      }
    }
  }

  async putInTransaction(tx: unknown, record: PosSaleIdempotencyRecord): Promise<void> {
    const dbTx = tx as Awaited<ReturnType<LoadPosDb>>;
    if (!dbTx) throw new Error(POS_DATABASE_UNAVAILABLE);
    try {
      await dbTx.insert(posSaleIdempotency).values({
        id: randomUUID(),
        restaurantId: record.restaurantId,
        terminalId: record.terminalId,
        userId: record.userId,
        idempotencyKey: record.idempotencyKey,
        fingerprint: record.fingerprint,
        orderId: record.orderId,
        orderNumber: record.orderNumber,
        trackingToken: record.trackingToken,
        displayReference: record.displayReference,
        totalAmount: record.totalAmount,
        itemCount: record.itemCount,
        checkId: record.checkId,
        subtotal: record.subtotal,
        taxAmount: record.taxAmount,
        grandTotal: record.grandTotal,
        billDiscountAmount: record.billDiscountAmount,
        linesJson: record.lines,
        createdAt: toMysqlTimestampString(record.createdAt),
      });
    } catch (error) {
      if (isMysqlDuplicateKeyError(error)) {
        throw new PosSaleIdempotencyUniqueCollisionError();
      }
      throw error;
    }
  }

  async runExclusive<T>(
    input: PosSaleIdempotencyKey,
    fn: () => Promise<T>
  ): Promise<T> {
    const id = `${input.restaurantId}:${input.terminalId}:${input.userId}:${input.idempotencyKey}`;
    const previous = this.tails.get(id) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(id, previous.then(() => next));
    // POS-SALE-PERSISTENCE-LATENCY-INSTRUMENTATION-1 — wait only (`await previous`).
    const waitStarted = orderLifecycleNowMs();
    await previous;
    try {
      noteOrderLifecyclePhase(
        "idempotency_wait_ms",
        orderLifecycleNowMs() - waitStarted
      );
    } catch {
      // Observability must not fail exclusive serialization.
    }
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

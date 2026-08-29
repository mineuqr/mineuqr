/**
 * CASHIER-INVOICE-IDENTITY-IMPLEMENTATION-1
 * Persistent Cashier invoice identity. Not Order identity. Not Collection Fact.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  formatCashierInvoiceNumber,
  type CashierInvoiceAssignment,
} from "@shared/pos";
import { cashierInvoices } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { readMysqlLastInsertId } from "../../_core/mysqlLastInsertId";
import {
  DiningSessionUnavailableError,
  isMysqlDuplicateKeyError,
} from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  if (typeof getDb !== "function") {
    throw new DiningSessionUnavailableError();
  }
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

function assignment(
  restaurantId: number,
  orderId: number,
  sequenceNumber: number
): CashierInvoiceAssignment {
  return {
    restaurantId,
    orderId,
    sequenceNumber,
    invoiceNumber: formatCashierInvoiceNumber(sequenceNumber),
  };
}

export async function cashierInvoiceNumberForOrder(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<string | null> {
  try {
    const found = await findCashierInvoiceByOrderId(input, client);
    return found?.invoiceNumber ?? null;
  } catch (error) {
    if (error instanceof DiningSessionUnavailableError) return null;
    throw error;
  }
}

export async function findCashierInvoiceByOrderId(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<CashierInvoiceAssignment | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select({
      restaurantId: cashierInvoices.restaurantId,
      orderId: cashierInvoices.orderId,
      sequenceNumber: cashierInvoices.sequenceNumber,
    })
    .from(cashierInvoices)
    .where(
      and(
        eq(cashierInvoices.restaurantId, input.restaurantId),
        eq(cashierInvoices.orderId, input.orderId)
      )
    )
    .limit(1);
  if (!row) return null;
  return assignment(row.restaurantId, row.orderId, row.sequenceNumber);
}

/** Read-only batch Invoice serials. Restaurant-scoped. Does not allocate. */
export async function mapCashierInvoiceNumbersByOrderIds(
  input: { restaurantId: number; orderIds: readonly number[] },
  client?: SessionDbClient
): Promise<ReadonlyMap<number, string>> {
  const orderIds = [
    ...new Set(
      input.orderIds.filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  const out = new Map<number, string>();
  if (orderIds.length === 0) return out;
  try {
    const db = await resolveDb(client);
    const rows = await db
      .select({
        orderId: cashierInvoices.orderId,
        sequenceNumber: cashierInvoices.sequenceNumber,
      })
      .from(cashierInvoices)
      .where(
        and(
          eq(cashierInvoices.restaurantId, input.restaurantId),
          inArray(cashierInvoices.orderId, orderIds)
        )
      );
    for (const row of rows) {
      out.set(row.orderId, formatCashierInvoiceNumber(row.sequenceNumber));
    }
    return out;
  } catch (error) {
    if (error instanceof DiningSessionUnavailableError) return out;
    throw error;
  }
}

/**
 * Allocate the next restaurant-scoped Cashier invoice number and bind it to orderId.
 * Idempotent: an existing binding is returned unchanged.
 */
export async function allocateCashierInvoiceForOrder(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<CashierInvoiceAssignment> {
  const existing = await findCashierInvoiceByOrderId(input, client);
  if (existing) return existing;

  const db = await resolveDb(client);
  await db.execute(sql`
    INSERT INTO cashier_invoice_sequences (restaurantId, lastNumber)
    VALUES (${input.restaurantId}, LAST_INSERT_ID(1))
    ON DUPLICATE KEY UPDATE lastNumber = LAST_INSERT_ID(lastNumber + 1)
  `);
  const seqResult = await db.execute(sql`SELECT LAST_INSERT_ID() AS n`);
  const sequenceNumber = Number(readMysqlLastInsertId(seqResult) || 1);
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error("Failed to allocate Cashier invoice sequence");
  }

  try {
    await db.insert(cashierInvoices).values({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      sequenceNumber,
    });
    return assignment(input.restaurantId, input.orderId, sequenceNumber);
  } catch (error) {
    if (!isMysqlDuplicateKeyError(error)) throw error;
    const raced = await findCashierInvoiceByOrderId(input, client);
    if (raced) return raced;
    throw error;
  }
}

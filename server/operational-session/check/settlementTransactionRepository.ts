/**
 * CHECK-SETTLEMENT-METHODS-1 — check_settlement_transactions persistence.
 * Owned by Check aggregate; not a separate write aggregate.
 */

import { and, eq, gte, lte } from "drizzle-orm";
import {
  checkSettlementTransactions,
  type SelectCheckSettlementTransaction,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import {
  assertPaymentMethod,
  assertSettlementTransactionStatus,
  type SettlementTransaction,
  type SettlementTransactionInput,
} from "@shared/operational-session";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

export function mapRowToSettlementTransaction(
  row: SelectCheckSettlementTransaction
): SettlementTransaction {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    sessionId: row.sessionId,
    paymentMethod: assertPaymentMethod(row.paymentMethod),
    amount: String(row.amount),
    currencyCode: row.currencyCode,
    status: assertSettlementTransactionStatus(row.status),
    businessTimestamp: row.businessTimestamp,
    reference: row.reference ?? null,
    externalReference: row.externalReference ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function insertSettlementTransactions(
  input: {
    restaurantId: number;
    checkId: number;
    sessionId: number | null;
    currencyCode: string;
    businessTimestamp: string;
    lines: readonly SettlementTransactionInput[];
  },
  client?: SessionDbClient
): Promise<void> {
  if (input.lines.length === 0) return;
  const db = await resolveDb(client);
  await db.insert(checkSettlementTransactions).values(
    input.lines.map((line) => ({
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      sessionId: input.sessionId,
      paymentMethod: line.paymentMethod,
      amount: line.amount,
      currencyCode: input.currencyCode,
      status: line.status ?? "captured",
      businessTimestamp: input.businessTimestamp,
      reference: line.reference ?? null,
      externalReference: line.externalReference ?? null,
      notes: line.notes ?? null,
    }))
  );
}

export async function listSettlementTransactionsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<SettlementTransaction[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkSettlementTransactions)
    .where(
      and(
        eq(checkSettlementTransactions.restaurantId, input.restaurantId),
        eq(checkSettlementTransactions.checkId, input.checkId)
      )
    );
  return rows.map(mapRowToSettlementTransaction);
}

/** Reporting / analytics read — tenant scoped, optional business timestamp window. */
export async function listSettlementTransactionsForRestaurant(
  input: {
    restaurantId: number;
    from?: string;
    to?: string;
  },
  client?: SessionDbClient
): Promise<SettlementTransaction[]> {
  const db = await resolveDb(client);
  const filters = [
    eq(checkSettlementTransactions.restaurantId, input.restaurantId),
  ];
  if (input.from) {
    filters.push(gte(checkSettlementTransactions.businessTimestamp, input.from));
  }
  if (input.to) {
    filters.push(lte(checkSettlementTransactions.businessTimestamp, input.to));
  }
  const rows = await db
    .select()
    .from(checkSettlementTransactions)
    .where(and(...filters));
  return rows.map(mapRowToSettlementTransaction);
}

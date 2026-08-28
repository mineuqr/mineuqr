/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
 * Drizzle Collection Fact repository. Insert + retrieve only. No money UPDATE.
 */

import { and, asc, eq, inArray, notExists, or, sql } from "drizzle-orm";
import {
  checkOrderMembership,
  operationalChecks,
  paymentCollectionFacts,
  type SelectPaymentCollectionFact,
} from "../../../../drizzle/schema";
import { getDb } from "../../../db";
import { DiningSessionUnavailableError } from "../../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../../diningSession/sessionRepository";
import {
  assertCollectionFactAppendOnly,
  CollectionFactError,
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  isCollectionFactPurpose,
  type CollectionFact,
  type CollectionFactCompositionLine,
  type CollectionFactTender,
} from "@shared/operational-session/payment/collection-fact";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { CASHIER_FINALIZABLE_ORDERING_CHANNELS } from "@shared/pos";
import { freezeCollectionFact } from "./collectionFactImmutability";
import type { CollectionFactStore } from "./collectionFactStore";
import type { CurrencySnapshot, TaxBreakdown, TaxPolicySnapshot } from "@shared/operational-session";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

function isMysqlDuplicateKeyError(error: unknown): boolean {
  const e = error as { code?: string | number; errno?: number; message?: string };
  return (
    e?.code === "ER_DUP_ENTRY" ||
    e?.errno === 1062 ||
    (typeof e?.message === "string" && e.message.includes("Duplicate"))
  );
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mapRowToCollectionFact(
  row: SelectPaymentCollectionFact
): CollectionFact {
  if (row.kind !== "collection") {
    throw new CollectionFactError("STORAGE", `Unsupported Collection Fact kind=${row.kind}`);
  }
  if (!isCollectionFactPurpose(row.purpose)) {
    throw new CollectionFactError("STORAGE", `Unsupported Collection Fact purpose=${row.purpose}`);
  }
  return {
    collectionFactId: row.collectionFactId,
    restaurantId: row.restaurantId,
    orderId: row.orderId,
    paymentIntentId: row.paymentIntentId,
    orderingChannel: row.orderingChannel,
    kind: "collection",
    purpose: row.purpose,
    schemaVersion: row.schemaVersion,
    subtotal: String(row.subtotal),
    discountAmount: String(row.discountAmount),
    taxAmount: String(row.taxAmount),
    amount: String(row.amount),
    currencyCode: row.currencyCode,
    currencySnapshot: row.currencySnapshotJson as CurrencySnapshot,
    taxPolicySnapshot: row.taxPolicySnapshotJson as TaxPolicySnapshot,
    taxBreakdown: row.taxBreakdownJson as TaxBreakdown,
    composition: asArray<CollectionFactCompositionLine>(row.compositionJson),
    tenders: asArray<CollectionFactTender>(row.tendersJson),
    checkId: row.checkId ?? null,
    actorType: row.actorType ?? null,
    actorId: row.actorId ?? null,
    terminalId: row.terminalId ?? null,
    businessDay: row.businessDay,
    idempotencyKey: row.idempotencyKey,
    fingerprint: row.fingerprint,
    committedAt: String(row.committedAt),
    createdAt: String(row.createdAt),
  };
}

export function toCollectionFactInsertValues(fact: CollectionFact) {
  return {
    collectionFactId: fact.collectionFactId,
    restaurantId: fact.restaurantId,
    orderId: fact.orderId,
    paymentIntentId: fact.paymentIntentId,
    orderingChannel: fact.orderingChannel,
    kind: fact.kind,
    purpose: fact.purpose,
    schemaVersion: fact.schemaVersion,
    subtotal: fact.subtotal,
    discountAmount: fact.discountAmount,
    taxAmount: fact.taxAmount,
    amount: fact.amount,
    currencyCode: fact.currencyCode,
    currencySnapshotJson: fact.currencySnapshot,
    taxPolicySnapshotJson: fact.taxPolicySnapshot,
    taxBreakdownJson: fact.taxBreakdown,
    compositionJson: fact.composition,
    tendersJson: fact.tenders,
    checkId: fact.checkId,
    actorType: fact.actorType,
    actorId: fact.actorId,
    terminalId: fact.terminalId,
    businessDay: fact.businessDay,
    idempotencyKey: fact.idempotencyKey,
    fingerprint: fact.fingerprint,
    committedAt: fact.committedAt,
    createdAt: fact.createdAt,
  };
}

export async function insertCollectionFact(
  fact: CollectionFact,
  client?: SessionDbClient
): Promise<CollectionFact> {
  assertCollectionFactAppendOnly("insert");
  const db = await resolveDb(client);
  try {
    await db.insert(paymentCollectionFacts).values(toCollectionFactInsertValues(fact));
    return freezeCollectionFact(fact);
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      throw new CollectionFactError("DUPLICATE", "Collection Fact already exists");
    }
    throw new CollectionFactError(
      "STORAGE",
      error instanceof Error ? error.message : "Collection Fact storage failed"
    );
  }
}

export async function findCollectionFactByIdempotency(
  input: { restaurantId: number; idempotencyKey: string },
  client?: SessionDbClient
): Promise<CollectionFact | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.idempotencyKey, input.idempotencyKey)
      )
    )
    .limit(1);
  return row ? mapRowToCollectionFact(row) : null;
}

export async function findCollectionFactByPaymentIntent(
  input: { restaurantId: number; paymentIntentId: string },
  client?: SessionDbClient
): Promise<CollectionFact | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.paymentIntentId, input.paymentIntentId)
      )
    )
    .limit(1);
  return row ? mapRowToCollectionFact(row) : null;
}

export async function findProductionCollectionFactByCheckId(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CollectionFact | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.checkId, input.checkId),
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE),
        eq(paymentCollectionFacts.orderingChannel, ORDERING_CHANNEL_CASHIER_POS)
      )
    )
    .limit(1);
  return row ? mapRowToCollectionFact(row) : null;
}

export async function findProductionCollectionFactByOrderId(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<CollectionFact | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.orderId, input.orderId),
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE)
      )
    )
    .orderBy(asc(paymentCollectionFacts.committedAt))
    .limit(1);
  return row ? mapRowToCollectionFact(row) : null;
}

/**
 * RECEIPT-SR-IDENTITY-1 — all production Collection Facts for one Order.
 * No LIMIT. Isolated purposes are excluded. Caller fail-closes on more than one.
 */
export async function listProductionCollectionFactsByOrderId(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<CollectionFact[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.orderId, input.orderId),
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE)
      )
    );
  return rows.map(mapRowToCollectionFact);
}

/**
 * REFUND-CF-ANCHOR-1 — all production Collection Facts that may anchor a Check refund.
 * No LIMIT. No channel filter. Caller fail-closes on more than one unique fact.
 */
export async function listProductionCollectionFactsForRefundAnchor(
  input: {
    restaurantId: number;
    checkId: number;
    orderIds: readonly number[];
  },
  client?: SessionDbClient
): Promise<CollectionFact[]> {
  const db = await resolveDb(client);
  const orderClause =
    input.orderIds.length > 0
      ? inArray(paymentCollectionFacts.orderId, [...input.orderIds])
      : undefined;
  const saleClause = orderClause
    ? or(orderClause, eq(paymentCollectionFacts.checkId, input.checkId))
    : eq(paymentCollectionFacts.checkId, input.checkId);
  const rows = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE),
        saleClause
      )
    );
  return rows.map(mapRowToCollectionFact);
}

/**
 * CRMP-CF-ATTRIBUTION-1 — load Collection Facts by immutable ids.
 * No LIMIT. Caller ignores isolated purposes for current-sale money.
 */
export async function listCollectionFactsByIds(
  input: {
    restaurantId: number;
    collectionFactIds: readonly string[];
  },
  client?: SessionDbClient
): Promise<CollectionFact[]> {
  const ids = input.collectionFactIds.filter((id) => id.trim().length > 0);
  if (ids.length === 0) return [];
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        inArray(paymentCollectionFacts.collectionFactId, ids)
      )
    );
  return rows.map(mapRowToCollectionFact);
}

/**
 * POST-PAYMENT-INCOMING-CHECK-RECOVERY-HARDENING-1
 * Production CFs on Cashier-finalizable channels whose Order has no
 * paid/complimentary Check yet. Direct cashier_pos stays eligible.
 * Incoming qr / waiter_tablet / kiosk / table_session use the same Check
 * finalizer already invoked on Confirm. Discovery is the CF row, not handoff.
 */
export async function listCashierPosProductionFactsAwaitingDownstreamSettlement(
  limit: number
): Promise<Array<{ restaurantId: number; orderId: number }>> {
  const db = await getDb();
  if (!db) return [];
  const take = Math.min(Math.max(limit, 0), 50);
  if (take === 0) return [];
  const completeMembership = db
    .select({ present: sql`1` })
    .from(checkOrderMembership)
    .innerJoin(
      operationalChecks,
      and(
        eq(checkOrderMembership.checkId, operationalChecks.id),
        eq(operationalChecks.restaurantId, checkOrderMembership.restaurantId)
      )
    )
    .where(
      and(
        eq(checkOrderMembership.orderId, paymentCollectionFacts.orderId),
        eq(checkOrderMembership.restaurantId, paymentCollectionFacts.restaurantId),
        eq(checkOrderMembership.active, 1),
        inArray(operationalChecks.outcome, ["paid", "complimentary"])
      )
    );
  const rows = await db
    .select({
      restaurantId: paymentCollectionFacts.restaurantId,
      orderId: paymentCollectionFacts.orderId,
    })
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE),
        inArray(
          paymentCollectionFacts.orderingChannel,
          CASHIER_FINALIZABLE_ORDERING_CHANNELS
        ),
        notExists(completeMembership)
      )
    )
    .orderBy(asc(paymentCollectionFacts.committedAt))
    .limit(take);
  return rows;
}

export async function findCollectionFactByFactId(
  input: { restaurantId: number; collectionFactId: string },
  client?: SessionDbClient
): Promise<CollectionFact | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.restaurantId, input.restaurantId),
        eq(paymentCollectionFacts.collectionFactId, input.collectionFactId)
      )
    )
    .limit(1);
  return row ? mapRowToCollectionFact(row) : null;
}

/** Structurally forbidden. Corrections are compensating facts (out of scope). */
export function updateCollectionFact(): never {
  assertCollectionFactAppendOnly("update");
  throw new CollectionFactError("IMMUTABLE", "Collection Fact UPDATE is forbidden");
}

/** Structurally forbidden. Historical facts are never deleted. */
export function deleteCollectionFact(): never {
  assertCollectionFactAppendOnly("delete");
  throw new CollectionFactError("IMMUTABLE", "Collection Fact DELETE is forbidden");
}

export function createDrizzleCollectionFactStore(
  client?: SessionDbClient
): CollectionFactStore {
  return {
    insert: (fact) => insertCollectionFact(fact, client),
    findByIdempotency: (input) => findCollectionFactByIdempotency(input, client),
    findByPaymentIntent: (input) =>
      findCollectionFactByPaymentIntent(input, client),
    findByFactId: (input) => findCollectionFactByFactId(input, client),
  };
}

/**
 * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1
 * Cashier Confirm consumes the certified Collection Fact writer.
 * Does not own persistence. Does not compute tax. Does not replace Check.
 */

import {
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  CollectionFactError,
  assertCashierProductionPaymentIdentities,
  collectionFactCommitIsPaid,
  type CollectionFactCompositionLine,
  type CollectionFactTender,
  type CommitCollectionFactResult,
} from "@shared/operational-session/payment/collection-fact";
import type {
  CurrencySnapshot,
  TaxBreakdown,
  TaxPolicySnapshot,
} from "@shared/operational-session";
import { and, eq } from "drizzle-orm";
import { isCashierFinalizableOrderingChannel } from "@shared/pos";
import { orders } from "../../../../drizzle/schema";
import { getDb } from "../../../db";
import { DiningSessionUnavailableError } from "../../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../../diningSession/sessionRepository";
import { allocateCashierInvoiceForOrder } from "../../../pos/cashier-invoice/cashierInvoiceRepository";
import { commitCollectionFact } from "./CollectionFactService";
import {
  createDrizzleCollectionFactStore,
  findProductionCollectionFactByOrderId,
} from "./collectionFactRepository";
import type { CollectionFactStore } from "./collectionFactStore";

export type CashierPaidMoneyFreeze = Readonly<{
  restaurantId: number;
  /** Optional operational bill reference. Not financial identity. */
  checkId: number | null;
  orderId: number;
  orderingChannel: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  taxBreakdown: TaxBreakdown;
  businessDay: string;
  tenders: readonly CollectionFactTender[];
  composition: readonly CollectionFactCompositionLine[];
}>;

export type CashierProductionCollectionCommitInput = Readonly<{
  paymentIntentId: string;
  idempotencyKey: string;
  terminalId: string;
  actorType: string;
  actorUserId: number;
  freeze: CashierPaidMoneyFreeze;
}>;

export async function commitCashierProductionCollectionFact(
  input: CashierProductionCollectionCommitInput,
  store: CollectionFactStore = createDrizzleCollectionFactStore()
): Promise<CommitCollectionFactResult> {
  assertCashierProductionPaymentIdentities({
    paymentIntentId: input.paymentIntentId,
    idempotencyKey: input.idempotencyKey,
    orderId: input.freeze.orderId,
    terminalId: input.terminalId,
    actorType: input.actorType,
    actorUserId: input.actorUserId,
  });
  if (!isCashierFinalizableOrderingChannel(input.freeze.orderingChannel)) {
    throw new CollectionFactError(
      "VALIDATION",
      "Production Collection Fact may be committed only through Cashier Confirm"
    );
  }
  const result = await commitCollectionFact(
    {
      context: {
        restaurantId: input.freeze.restaurantId,
        actorAuthorized: true,
        actorUserId: input.actorUserId,
        actorType: input.actorType,
        terminalId: input.terminalId,
      },
      command: {
        restaurantId: input.freeze.restaurantId,
        orderId: input.freeze.orderId,
        paymentIntentId: input.paymentIntentId.trim(),
        orderingChannel: input.freeze.orderingChannel,
        purpose: COLLECTION_FACT_PRODUCTION_PURPOSE,
        subtotal: input.freeze.subtotal,
        discountAmount: input.freeze.discountAmount,
        taxAmount: input.freeze.taxAmount,
        amount: input.freeze.grandTotal,
        currencyCode: input.freeze.currencySnapshot.currencyCode,
        currencySnapshot: input.freeze.currencySnapshot,
        taxPolicySnapshot: input.freeze.taxPolicySnapshot,
        taxBreakdown: input.freeze.taxBreakdown,
        composition: input.freeze.composition,
        tenders: input.freeze.tenders,
        checkId: input.freeze.checkId,
        businessDay: input.freeze.businessDay,
        idempotencyKey: input.idempotencyKey.trim(),
      },
    },
    store
  );
  if (!collectionFactCommitIsPaid(result.outcome)) {
    throw new CollectionFactError(
      "STORAGE",
      "Collection Fact commit did not produce PAID"
    );
  }
  return result;
}

/**
 * INCOMING-CONFIRM-ORDER-LOCK-HARDENING-1
 * Serialize Incoming Confirm on (restaurantId, orderId) before the CF decision.
 * SELECT FOR UPDATE is a current read; the following CF lookup in this
 * transaction therefore observes a collection committed by the previous holder.
 * Does not lock the restaurant, terminal, or other Orders.
 * Direct Cashier Place does not enter this function.
 */
export async function lockOrderRowForIncomingConfirm(
  tx: SessionDbClient,
  input: { restaurantId: number; orderId: number }
): Promise<{ id: number; restaurantId: number } | null> {
  const [row] = await tx
    .select({
      id: orders.id,
      restaurantId: orders.restaurantId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, input.restaurantId),
        eq(orders.id, input.orderId)
      )
    )
    .limit(1)
    .for("update");
  return row ?? null;
}

/**
 * One financial transaction: lock Order, replay existing production CF, else
 * bind Cashier invoice identity and insert Collection Fact.
 * Invoice identity is not a ledger. Check is not a participant.
 */
export async function runIncomingCashierCollectionFactTransaction(
  tx: SessionDbClient,
  input: CashierProductionCollectionCommitInput
): Promise<CommitCollectionFactResult> {
  const restaurantId = input.freeze.restaurantId;
  const orderId = input.freeze.orderId;
  const locked = await lockOrderRowForIncomingConfirm(tx, {
    restaurantId,
    orderId,
  });
  if (!locked) {
    throw new CollectionFactError("STORAGE", "Order not found");
  }
  const existing = await findProductionCollectionFactByOrderId(
    { restaurantId, orderId },
    tx
  );
  if (existing) {
    return { outcome: "replayed", fact: existing };
  }
  await allocateCashierInvoiceForOrder({ restaurantId, orderId }, tx);
  return commitCashierProductionCollectionFact(
    input,
    createDrizzleCollectionFactStore(tx)
  );
}

/**
 * Incoming Confirm Invoice + CF commit. Direct Cashier Place uses a different
 * persist transaction and does not enter this function.
 * A concurrent Confirm with a different idempotency key waits on the Order
 * row, then replays the committed production CF. A failed attempt retries
 * through the same CF-by-order path rather than inserting a second collection.
 */
export async function commitCashierProductionCollectionFactInTransaction(
  input: CashierProductionCollectionCommitInput
): Promise<CommitCollectionFactResult> {
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db.transaction(async (tx) =>
    runIncomingCashierCollectionFactTransaction(tx as SessionDbClient, input)
  );
}

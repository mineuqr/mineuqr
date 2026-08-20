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
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { commitCollectionFact } from "./CollectionFactService";
import { createDrizzleCollectionFactStore } from "./collectionFactRepository";
import type { CollectionFactStore } from "./collectionFactStore";

export type CashierPaidMoneyFreeze = Readonly<{
  restaurantId: number;
  checkId: number;
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
  if (input.freeze.orderingChannel !== ORDERING_CHANNEL_CASHIER_POS) {
    throw new CollectionFactError(
      "VALIDATION",
      "Cashier production Collection Fact is limited to cashier_pos"
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

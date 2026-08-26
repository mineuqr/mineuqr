/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
 * Shadow / synthetic freeze comparison. Does not write Revenue, Settlement, or PAID.
 */

import type {
  CollectionFact,
  CollectionFactCompositionLine,
  CollectionFactPurpose,
  CollectionFactTender,
  CommitCollectionFactCommand,
} from "./collectionFactContract";
import type { CurrencySnapshot, TaxBreakdown, TaxPolicySnapshot } from "../../check/checkContract";
import type { OrderingChannelId } from "../../../ordering-platform/orderingChannelRegistry";

export type CollectionFactFreezeSource = Readonly<{
  restaurantId: number;
  orderId: number;
  paymentIntentId: string;
  orderingChannel: OrderingChannelId | string;
  purpose: CollectionFactPurpose;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  amount: string;
  currencyCode: string;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  taxBreakdown: TaxBreakdown;
  composition: readonly CollectionFactCompositionLine[];
  tenders: readonly CollectionFactTender[];
  checkId?: number | null;
  businessDay: string;
  idempotencyKey: string;
}>;

export type CollectionFactShadowMismatch = Readonly<{
  field: string;
  expected: string;
  actual: string;
}>;

export function deriveShadowCollectionFactCommand(
  source: CollectionFactFreezeSource
): CommitCollectionFactCommand {
  return {
    restaurantId: source.restaurantId,
    orderId: source.orderId,
    paymentIntentId: source.paymentIntentId,
    orderingChannel: source.orderingChannel,
    purpose: source.purpose,
    subtotal: source.subtotal,
    discountAmount: source.discountAmount,
    taxAmount: source.taxAmount,
    amount: source.amount,
    currencyCode: source.currencyCode,
    currencySnapshot: source.currencySnapshot,
    taxPolicySnapshot: source.taxPolicySnapshot,
    taxBreakdown: source.taxBreakdown,
    composition: source.composition,
    tenders: source.tenders,
    checkId: source.checkId ?? null,
    businessDay: source.businessDay,
    idempotencyKey: source.idempotencyKey,
  };
}

export function compareCollectionFactToFreeze(
  fact: CollectionFact,
  source: CollectionFactFreezeSource
): readonly CollectionFactShadowMismatch[] {
  const pairs: Array<[string, string, string]> = [
    ["restaurantId", String(source.restaurantId), String(fact.restaurantId)],
    ["orderId", String(source.orderId), String(fact.orderId)],
    ["paymentIntentId", source.paymentIntentId, fact.paymentIntentId],
    ["amount", source.amount, fact.amount],
    ["subtotal", source.subtotal, fact.subtotal],
    ["discountAmount", source.discountAmount, fact.discountAmount],
    ["taxAmount", source.taxAmount, fact.taxAmount],
    ["currencyCode", source.currencyCode, fact.currencyCode],
    ["businessDay", source.businessDay, fact.businessDay],
    ["tenders", JSON.stringify(source.tenders), JSON.stringify(fact.tenders)],
  ];
  return pairs
    .filter(([, expected, actual]) => expected !== actual)
    .map(([field, expected, actual]) => ({ field, expected, actual }));
}

/**
 * REVENUE-UNION-ADOPTION-1 — canonical union identity (ADR-ARCH-039 §7).
 *
 * Legacy: one paid Check / gen=1 SR is one contribution (`check:{restaurantId}:{checkId}`).
 * Collection Fact: one payment intent is one contribution (`intent:{restaurantId}:{paymentIntentId}`).
 * Sale overlap key: `sale:{restaurantId}:{orderingChannel}:{orderId}` (Cashier 1:1).
 */

import type {
  RevenueUnionCollectionFact,
  RevenueUnionLegacyFact,
  RevenueUnionSaleKey,
} from "./revenueUnionContract";

export function legacyContributionId(fact: RevenueUnionLegacyFact): string {
  return `check:${fact.restaurantId}:${fact.checkId}`;
}

export function collectionContributionId(
  fact: RevenueUnionCollectionFact
): string {
  return `intent:${fact.restaurantId}:${fact.paymentIntentId}`;
}

export function saleOverlapKey(input: RevenueUnionSaleKey): string {
  return `sale:${input.restaurantId}:${input.orderingChannel}:${input.orderId}`;
}

export function legacySaleKeys(
  fact: RevenueUnionLegacyFact
): readonly string[] {
  if (fact.orderIds.length === 0 || !fact.orderingChannel) return [];
  return fact.orderIds.map((orderId) =>
    saleOverlapKey({
      restaurantId: fact.restaurantId,
      orderingChannel: fact.orderingChannel as string,
      orderId,
    })
  );
}

export function collectionSaleKey(fact: RevenueUnionCollectionFact): string {
  return saleOverlapKey({
    restaurantId: fact.restaurantId,
    orderingChannel: fact.orderingChannel,
    orderId: fact.orderId,
  });
}

export function checkOverlapKey(input: {
  restaurantId: number;
  checkId: number;
}): string {
  return `checkref:${input.restaurantId}:${input.checkId}`;
}

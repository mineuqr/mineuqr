/**
 * REVENUE-UNION-ADOPTION-1 / REVENUE-UNION-PUBLISHED-ADOPTION-1
 * Canonical union identity (ADR-ARCH-039 §7).
 *
 * No single identifier is sufficient. Contribution identity is composite:
 * - Legacy: `check:{restaurantId}:{checkId}`
 * - Collection Fact: `intent:{restaurantId}:{paymentIntentId}`
 * - Sale overlap: `sale:{restaurantId}:{orderingChannel}:{orderId}`
 * - Optional Check overlap: `checkref:{restaurantId}:{checkId}`
 *
 * Persist-time uniqueness remains `(restaurantId, idempotencyKey)` and
 * `(restaurantId, paymentIntentId)`. Settlement ids are publication metadata,
 * not a second Gross root. Split tenders share one contribution id.
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

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

function sameRestaurantOrderMention(
  legacy: Pick<
    RevenueUnionLegacyFact,
    "restaurantId" | "orderIds"
  >,
  fact: Pick<RevenueUnionCollectionFact, "restaurantId" | "orderId">
): boolean {
  if (legacy.restaurantId !== fact.restaurantId) return false;
  if (!Number.isInteger(fact.orderId) || fact.orderId <= 0) return false;
  return legacy.orderIds.includes(fact.orderId);
}

/**
 * Canonical economic overlap: exclusive restaurantId + singleton orderId.
 * orderingChannel is required when the legacy snapshot has one.
 * Empty legacy orderIds cannot prove overlap. checkId is not economic identity.
 */
export function provenEconomicSaleOverlap(
  legacy: Pick<
    RevenueUnionLegacyFact,
    "restaurantId" | "orderingChannel" | "orderIds"
  >,
  fact: Pick<
    RevenueUnionCollectionFact,
    "restaurantId" | "orderingChannel" | "orderId"
  >
): boolean {
  if (!sameRestaurantOrderMention(legacy, fact)) return false;
  if (legacy.orderIds.length !== 1 || legacy.orderIds[0] !== fact.orderId) {
    return false;
  }
  const channel = (legacy.orderingChannel ?? "").trim();
  if (channel && channel !== fact.orderingChannel) return false;
  return true;
}

/**
 * Same restaurant and order mention as a Collection Fact, but the Union cannot
 * prove the Settlement Record Gross is that exclusive sale (multi-order Check
 * or orderingChannel mismatch). Must not publish both and must not CF-win.
 */
export function unsafeEconomicIdentityCollision(
  legacy: Pick<
    RevenueUnionLegacyFact,
    "restaurantId" | "orderingChannel" | "orderIds"
  >,
  fact: Pick<
    RevenueUnionCollectionFact,
    "restaurantId" | "orderingChannel" | "orderId"
  >
): boolean {
  return (
    sameRestaurantOrderMention(legacy, fact) &&
    !provenEconomicSaleOverlap(legacy, fact)
  );
}

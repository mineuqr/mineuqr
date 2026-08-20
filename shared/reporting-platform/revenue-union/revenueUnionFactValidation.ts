/**
 * Collection Fact fields that must be valid before a fact can be COLLECTION_FACT
 * authority. Invalid eligible facts are UNRESOLVED and are not published.
 */

import type { RevenueUnionCollectionFact } from "./revenueUnionContract";

const MONEY = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;
const BUSINESS_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCollectionFactAuthority(
  fact: RevenueUnionCollectionFact
): boolean {
  if (!Number.isInteger(fact.restaurantId) || fact.restaurantId <= 0) {
    return false;
  }
  if (!Number.isInteger(fact.orderId) || fact.orderId <= 0) {
    return false;
  }
  if (!fact.collectionFactId.trim() || !fact.paymentIntentId.trim()) {
    return false;
  }
  if (!fact.orderingChannel.trim() || !fact.currencyCode.trim()) {
    return false;
  }
  if (!BUSINESS_DAY.test(fact.businessDay)) {
    return false;
  }
  if (!MONEY.test(fact.amount.trim()) || !MONEY.test(fact.taxAmount.trim())) {
    return false;
  }
  return true;
}

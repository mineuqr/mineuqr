/**
 * REVENUE-UNION-PUBLISHED-ADOPTION-1 / REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1
 * BOTH (isolated dual-run), UNRESOLVED, DUPLICATE, and PRODUCTION_OVERLAP
 * are classifier/conflict classes. Only LEGACY_CHECK and COLLECTION_FACT
 * are published contribution authorities. PRODUCTION_OVERLAP publishes the
 * Collection Fact contribution only — not a second Gross root.
 */

import type { RevenueAuthorityClass } from "./revenueUnionContract";

export function classifyEconomicTransaction(input: {
  paidLegacyPresent: boolean;
  eligibleFactPresent: boolean;
  eligibleFactValid?: boolean;
  /** Proven restaurantId + orderId (+ channel when legacy has one). */
  saleOverlapProven?: boolean;
  /** Valid published production Collection Fact (not isolated). */
  productionPublishedEligible?: boolean;
}): RevenueAuthorityClass {
  const factValid = input.eligibleFactValid !== false;
  const validEligibleFact = input.eligibleFactPresent && factValid;

  if (input.eligibleFactPresent && !factValid) {
    return "UNRESOLVED";
  }
  if (
    input.paidLegacyPresent &&
    validEligibleFact &&
    input.productionPublishedEligible &&
    input.saleOverlapProven
  ) {
    return "PRODUCTION_OVERLAP";
  }
  if (input.paidLegacyPresent && validEligibleFact) {
    return "BOTH";
  }
  if (input.paidLegacyPresent) {
    return "LEGACY_CHECK";
  }
  if (validEligibleFact) {
    return "COLLECTION_FACT";
  }
  return "UNRESOLVED";
}

export function isPublishableAuthorityClass(
  authority: RevenueAuthorityClass
): authority is "LEGACY_CHECK" | "COLLECTION_FACT" {
  return authority === "LEGACY_CHECK" || authority === "COLLECTION_FACT";
}

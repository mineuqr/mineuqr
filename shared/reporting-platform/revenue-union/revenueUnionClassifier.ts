/**
 * REVENUE-UNION-PUBLISHED-ADOPTION-1 — deterministic authority class.
 * BOTH and UNRESOLVED never become a published contribution.
 */

import type { RevenueAuthorityClass } from "./revenueUnionContract";

export function classifyEconomicTransaction(input: {
  paidLegacyPresent: boolean;
  eligibleFactPresent: boolean;
  eligibleFactValid?: boolean;
}): RevenueAuthorityClass {
  const factValid = input.eligibleFactValid !== false;
  const validEligibleFact = input.eligibleFactPresent && factValid;

  if (input.eligibleFactPresent && !factValid) {
    return "UNRESOLVED";
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

/**
 * REVENUE-UNION-ADOPTION-1 / REVENUE-UNION-PUBLISHED-ADOPTION-1
 * ADR-ARCH-039 I-REV-U-01/02
 *
 * Union engine + published authority resolution.
 * Isolated purposes never publish. Production purpose may publish when valid.
 */

import type { CollectionFactPurpose } from "../../operational-session/payment/collection-fact/collectionFactContract";
import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "../../operational-session/payment/collection-fact/collectionFactContract";
import type { CurrencySnapshot, TaxPolicySnapshot } from "../../operational-session/check/checkContract";

export const REVENUE_UNION_PROGRAM_ID = "REVENUE-UNION-ADOPTION-1" as const;
export const REVENUE_UNION_PUBLISHED_PROGRAM_ID =
  "REVENUE-UNION-PUBLISHED-ADOPTION-1" as const;

export const REVENUE_AUTHORITIES = ["LEGACY_CHECK", "COLLECTION_FACT"] as const;
export type RevenueAuthority = (typeof REVENUE_AUTHORITIES)[number];

/**
 * Transaction classifier output.
 * BOTH (isolated dual-run) and UNRESOLVED are never published.
 * PRODUCTION_OVERLAP publishes the Collection Fact only.
 */
export const REVENUE_AUTHORITY_CLASSES = [
  "LEGACY_CHECK",
  "COLLECTION_FACT",
  "PRODUCTION_OVERLAP",
  "UNRESOLVED",
  "DUPLICATE",
  "BOTH",
] as const;
export type RevenueAuthorityClass = (typeof REVENUE_AUTHORITY_CLASSES)[number];

/**
 * Persistable Collection Fact purposes that may enter Published Revenue.
 * Production only. Isolated purposes must never be added here.
 * Compensating refund/void Collection Fact kinds do not exist.
 * Complimentary is a production Collection Fact with collected amount 0
 * (waived discount). Not a second fact kind.
 */
export const PUBLISHED_COLLECTION_FACT_PURPOSES: readonly CollectionFactPurpose[] =
  [COLLECTION_FACT_PRODUCTION_PURPOSE];

export type RevenueUnionSaleKey = Readonly<{
  restaurantId: number;
  orderingChannel: string;
  orderId: number;
}>;

export type RevenueUnionLegacyFact = Readonly<{
  restaurantId: number;
  checkId: number;
  settlementRecordId: string | null;
  outcome: "paid" | "complimentary" | "voided";
  grandTotal: string;
  taxAmount: string;
  currencyCode: string;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  businessDay: string | null;
  settledAt: string | null;
  voidedAt: string | null;
  orderingChannel: string | null;
  orderIds: readonly number[];
}>;

export type RevenueUnionCollectionFact = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  orderId: number;
  paymentIntentId: string;
  orderingChannel: string;
  purpose: CollectionFactPurpose;
  amount: string;
  taxAmount: string;
  discountAmount: string;
  currencyCode: string;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  tenders: readonly { paymentMethod: string; amount: string }[];
  checkId: number | null;
  businessDay: string;
  committedAt: string;
}>;

export type RevenueUnionRefundFact = Readonly<{
  restaurantId: number;
  checkId: number;
  settlementRecordId: string | null;
  grandTotal: string;
  settledAt: string | null;
  businessDay: string | null;
}>;

/**
 * none — never contribute (alias of published while the allowlist is empty)
 * isolated — synthetic|shadow|test|validation; shadow/tests only
 * published — only PUBLISHED_COLLECTION_FACT_PURPOSES (production)
 */
export type CollectionFactEligibility = "none" | "isolated" | "published";

export type ResolvedRevenueContribution = Readonly<{
  authority: RevenueAuthority;
  contributionId: string;
  saleKey: string | null;
  restaurantId: number;
  amount: string;
  taxAmount: string;
  currencyCode: string;
  businessDay: string | null;
  outcome: "paid" | "complimentary" | "voided";
}>;

export type RevenueUnionConflict = Readonly<{
  code:
    | "BOTH"
    | "PRODUCTION_OVERLAP"
    | "DUPLICATE_LEGACY"
    | "DUPLICATE_FACT"
    | "CURRENCY"
    | "UNRESOLVED"
    | "ELIGIBILITY_REJECTED";
  contributionId: string;
  message: string;
}>;

export type RevenueUnionTotals = Readonly<{
  grossRevenue: string;
  legacyGross: string;
  collectionFactGross: string;
  taxCollected: string;
  paidContributionCount: number;
  legacyPaidCount: number;
  collectionFactCount: number;
  complimentaryCount: number;
  complimentaryAmount: string;
  voidedCount: number;
  refundPublishedTotal: string;
  refundPublicationCount: number;
  netRevenue: string;
}>;

export type RevenueUnionResult = Readonly<{
  programId: typeof REVENUE_UNION_PROGRAM_ID;
  eligibility: CollectionFactEligibility;
  totals: RevenueUnionTotals;
  contributions: readonly ResolvedRevenueContribution[];
  conflicts: readonly RevenueUnionConflict[];
  excludedLegacyIds: readonly string[];
  excludedFactIds: readonly string[];
  productionOverlapExcludedLegacyIds: readonly string[];
  eligibilityRejectedFactCount: number;
  unresolvedCount: number;
  productionOverlapCount: number;
}>;

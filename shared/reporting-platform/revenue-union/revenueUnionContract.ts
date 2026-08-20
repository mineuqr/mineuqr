/**
 * REVENUE-UNION-ADOPTION-1 / ADR-ARCH-039 I-REV-U-01/02
 * Shadow Revenue Union contract. Not published Dashboard authority.
 */

import type { CollectionFactPurpose } from "../../operational-session/payment/collection-fact/collectionFactContract";
import type { CurrencySnapshot, TaxPolicySnapshot } from "../../operational-session/check/checkContract";

export const REVENUE_UNION_PROGRAM_ID = "REVENUE-UNION-ADOPTION-1" as const;

export const REVENUE_AUTHORITIES = ["LEGACY_CHECK", "COLLECTION_FACT"] as const;
export type RevenueAuthority = (typeof REVENUE_AUTHORITIES)[number];

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

/** Isolated facts may contribute only in shadow/validation. Published allowlist is empty. */
export type CollectionFactEligibility = "none" | "isolated";

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
  code: "BOTH" | "DUPLICATE_LEGACY" | "DUPLICATE_FACT" | "CURRENCY";
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
}>;

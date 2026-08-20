export {
  REVENUE_UNION_PROGRAM_ID,
  REVENUE_AUTHORITIES,
  type RevenueAuthority,
  type RevenueUnionSaleKey,
  type RevenueUnionLegacyFact,
  type RevenueUnionCollectionFact,
  type RevenueUnionRefundFact,
  type CollectionFactEligibility,
  type ResolvedRevenueContribution,
  type RevenueUnionConflict,
  type RevenueUnionTotals,
  type RevenueUnionResult,
} from "./revenueUnionContract";

export {
  legacyContributionId,
  collectionContributionId,
  saleOverlapKey,
  legacySaleKeys,
  collectionSaleKey,
  checkOverlapKey,
} from "./revenueUnionIdentity";

export {
  isCollectionFactRevenueEligible,
  resolveRevenueUnionSets,
} from "./revenueUnionResolver";

export {
  computeRevenueUnion,
  periodKeyFromFrozenBusinessDay,
} from "./revenueUnionAggregator";

export {
  compareLegacyToUnion,
  compareFactToContribution,
  moneyEquals,
  type RevenueUnionMismatch,
} from "./revenueUnionReconciliation";

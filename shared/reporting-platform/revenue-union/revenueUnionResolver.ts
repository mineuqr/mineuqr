/**
 * REVENUE-UNION-ADOPTION-1 / REVENUE-UNION-PUBLISHED-ADOPTION-1
 * REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1
 * One authority per transaction (I-REV-U-01).
 * Isolated dual-run BOTH and UNRESOLVED are never published.
 * Proven published production overlap: Collection Fact wins; legacy Gross excluded.
 * Isolated purposes never enter published eligibility.
 * checkId is not economic identity.
 */

import type { CollectionFactPurpose } from "../../operational-session/payment/collection-fact/collectionFactContract";
import { COLLECTION_FACT_ISOLATED_PURPOSES } from "../../operational-session/payment/collection-fact/collectionFactContract";
import { isComplimentaryCollectionFact } from "../../pos/cashierFinancialFinalization";
import { parseReportingAmount } from "../reportingMoney";
import type {
  CollectionFactEligibility,
  ResolvedRevenueContribution,
  RevenueUnionCollectionFact,
  RevenueUnionConflict,
  RevenueUnionLegacyFact,
} from "./revenueUnionContract";
import { PUBLISHED_COLLECTION_FACT_PURPOSES } from "./revenueUnionContract";
import { classifyEconomicTransaction } from "./revenueUnionClassifier";
import { isValidCollectionFactAuthority } from "./revenueUnionFactValidation";
import {
  collectionContributionId,
  collectionSaleKey,
  legacyContributionId,
  legacySaleKeys,
  provenEconomicSaleOverlap,
  unsafeEconomicIdentityCollision,
} from "./revenueUnionIdentity";

const ISOLATED_PURPOSES = new Set<string>(COLLECTION_FACT_ISOLATED_PURPOSES);
const PUBLISHED_PURPOSES = new Set<string>(PUBLISHED_COLLECTION_FACT_PURPOSES);

export function isCollectionFactRevenueEligible(
  purpose: CollectionFactPurpose,
  eligibility: CollectionFactEligibility
): boolean {
  if (eligibility === "none") return false;
  if (eligibility === "published") {
    return PUBLISHED_PURPOSES.has(purpose);
  }
  return ISOLATED_PURPOSES.has(purpose);
}

export type ResolvedRevenueUnionSets = Readonly<{
  contributions: readonly ResolvedRevenueContribution[];
  conflicts: readonly RevenueUnionConflict[];
  excludedLegacyIds: ReadonlySet<string>;
  excludedFactIds: ReadonlySet<string>;
  productionOverlapExcludedLegacyIds: ReadonlySet<string>;
  eligibilityRejectedFactCount: number;
  unresolvedCount: number;
  productionOverlapCount: number;
}>;

function paidLegacy(fact: RevenueUnionLegacyFact): boolean {
  return fact.outcome === "paid";
}

function moneyCompatible(
  legacy: RevenueUnionLegacyFact,
  fact: RevenueUnionCollectionFact
): boolean {
  return (
    parseReportingAmount(legacy.grandTotal) === parseReportingAmount(fact.amount) &&
    legacy.currencyCode === fact.currencyCode
  );
}

export function resolveRevenueUnionSets(input: {
  legacy: readonly RevenueUnionLegacyFact[];
  facts: readonly RevenueUnionCollectionFact[];
  eligibility: CollectionFactEligibility;
}): ResolvedRevenueUnionSets {
  const conflicts: RevenueUnionConflict[] = [];
  const excludedLegacyIds = new Set<string>();
  const excludedFactIds = new Set<string>();
  const productionOverlapExcludedLegacyIds = new Set<string>();

  const legacyById = new Map<string, RevenueUnionLegacyFact>();
  for (const row of input.legacy) {
    if (row.restaurantId <= 0) continue;
    const id = legacyContributionId(row);
    if (legacyById.has(id)) {
      conflicts.push({
        code: "DUPLICATE_LEGACY",
        contributionId: id,
        message: "Duplicate legacy Check contribution collapsed",
      });
      continue;
    }
    legacyById.set(id, row);
  }

  const factsById = new Map<string, RevenueUnionCollectionFact>();
  let eligibilityRejectedFactCount = 0;
  for (const row of input.facts) {
    if (!isCollectionFactRevenueEligible(row.purpose, input.eligibility)) {
      eligibilityRejectedFactCount += 1;
      if (input.eligibility === "published") {
        conflicts.push({
          code: "ELIGIBILITY_REJECTED",
          contributionId: collectionContributionId(row),
          message: "Collection Fact purpose is not published-eligible",
        });
      }
      continue;
    }
    const id = collectionContributionId(row);
    if (!isValidCollectionFactAuthority(row)) {
      conflicts.push({
        code: "UNRESOLVED",
        contributionId: id,
        message: "Eligible Collection Fact failed authority validation",
      });
      continue;
    }
    if (factsById.has(id)) {
      conflicts.push({
        code: "DUPLICATE_FACT",
        contributionId: id,
        message: "Duplicate Collection Fact intent collapsed",
      });
      continue;
    }
    factsById.set(id, row);
  }

  const factsBySaleIds = new Map<string, string[]>();
  for (const [id, fact] of factsById) {
    const saleKey = collectionSaleKey(fact);
    const ids = factsBySaleIds.get(saleKey) ?? [];
    ids.push(id);
    factsBySaleIds.set(saleKey, ids);
  }
  for (const [saleKey, ids] of factsBySaleIds) {
    if (ids.length < 2) continue;
    conflicts.push({
      code: "DUPLICATE_FACT",
      contributionId: saleKey,
      message: "Duplicate Collection Fact economic identity collapsed",
    });
    for (const id of ids) excludedFactIds.add(id);
  }

  for (const [legacyId, legacy] of legacyById) {
    let duplicateCollision = false;
    for (const id of excludedFactIds) {
      const excludedFact = factsById.get(id);
      if (!excludedFact) continue;
      if (
        provenEconomicSaleOverlap(legacy, excludedFact) ||
        unsafeEconomicIdentityCollision(legacy, excludedFact)
      ) {
        duplicateCollision = true;
        conflicts.push({
          code: "UNRESOLVED",
          contributionId: `${legacyId}|${id}`,
          message:
            "Duplicate Production Collection Facts collide with a legacy sale — not published",
        });
        excludedLegacyIds.add(legacyId);
        break;
      }
    }
    if (duplicateCollision) continue;

    let unsafeFactId: string | undefined;
    for (const [id, fact] of factsById) {
      if (excludedFactIds.has(id)) continue;
      if (unsafeEconomicIdentityCollision(legacy, fact)) {
        unsafeFactId = id;
        break;
      }
    }
    if (unsafeFactId) {
      conflicts.push({
        code: "UNRESOLVED",
        contributionId: `${legacyId}|${unsafeFactId}`,
        message:
          "Order mention without exclusive economic-sale proof — not published",
      });
      excludedLegacyIds.add(legacyId);
      excludedFactIds.add(unsafeFactId);
      continue;
    }

    let factId: string | undefined;
    for (const [id, fact] of factsById) {
      if (excludedFactIds.has(id)) continue;
      if (provenEconomicSaleOverlap(legacy, fact)) {
        factId = id;
        break;
      }
    }
    const fact = factId ? factsById.get(factId) : undefined;
    const saleOverlapProven = Boolean(fact);
    const productionPublishedEligible = Boolean(
      fact &&
        input.eligibility === "published" &&
        PUBLISHED_PURPOSES.has(fact.purpose)
    );
    const authority = classifyEconomicTransaction({
      paidLegacyPresent: paidLegacy(legacy),
      eligibleFactPresent: Boolean(fact),
      saleOverlapProven,
      productionPublishedEligible,
    });
    if (saleOverlapProven && fact && factId && !paidLegacy(legacy)) {
      excludedLegacyIds.add(legacyId);
      continue;
    }
    if (authority === "PRODUCTION_OVERLAP" && fact && factId) {
      if (!moneyCompatible(legacy, fact)) {
        conflicts.push({
          code: "UNRESOLVED",
          contributionId: `${legacyId}|${factId}`,
          message:
            "Proven economic overlap with disagreeing amount/currency — not merged",
        });
        excludedLegacyIds.add(legacyId);
        excludedFactIds.add(factId);
        continue;
      }
      conflicts.push({
        code: "PRODUCTION_OVERLAP",
        contributionId: `${legacyId}|${factId}`,
        message:
          "Production Collection Fact wins proven economic overlap; legacy Gross excluded",
      });
      excludedLegacyIds.add(legacyId);
      productionOverlapExcludedLegacyIds.add(legacyId);
      continue;
    }
    if (factId && authority === "BOTH") {
      conflicts.push({
        code: "BOTH",
        contributionId: `${legacyId}|${factId}`,
        message:
          "Same transaction has paid Check and Collection Fact — neither is published",
      });
      excludedLegacyIds.add(legacyId);
      excludedFactIds.add(factId);
    }
  }

  const contributions: ResolvedRevenueContribution[] = [];

  for (const [id, legacy] of legacyById) {
    if (excludedLegacyIds.has(id)) continue;
    contributions.push({
      authority: "LEGACY_CHECK",
      saleKey: legacySaleKeys(legacy)[0] ?? null,
      contributionId: id,
      restaurantId: legacy.restaurantId,
      amount: legacy.grandTotal,
      taxAmount: legacy.outcome === "paid" ? legacy.taxAmount : "0.00",
      currencyCode: legacy.currencyCode,
      businessDay: legacy.businessDay,
      outcome: legacy.outcome,
    });
  }

  for (const [id, fact] of factsById) {
    if (excludedFactIds.has(id)) continue;
    contributions.push({
      authority: "COLLECTION_FACT",
      contributionId: id,
      saleKey: collectionSaleKey(fact),
      restaurantId: fact.restaurantId,
      amount: isComplimentaryCollectionFact(fact)
        ? fact.discountAmount
        : fact.amount,
      taxAmount: isComplimentaryCollectionFact(fact) ? "0.00" : fact.taxAmount,
      currencyCode: fact.currencyCode,
      businessDay: fact.businessDay,
      outcome: isComplimentaryCollectionFact(fact) ? "complimentary" : "paid",
    });
  }

  const currencies = new Set(
    contributions
      .filter((c) => c.outcome === "paid")
      .map((c) => c.currencyCode)
  );
  if (currencies.size > 1) {
    conflicts.push({
      code: "CURRENCY",
      contributionId: "union",
      message: "Mixed currency codes in published union set",
    });
  }

  const unresolvedCount = conflicts.filter((c) => c.code === "UNRESOLVED").length;
  const productionOverlapCount = conflicts.filter(
    (c) => c.code === "PRODUCTION_OVERLAP"
  ).length;

  return {
    contributions,
    conflicts,
    excludedLegacyIds,
    excludedFactIds,
    productionOverlapExcludedLegacyIds,
    eligibilityRejectedFactCount,
    unresolvedCount,
    productionOverlapCount,
  };
}

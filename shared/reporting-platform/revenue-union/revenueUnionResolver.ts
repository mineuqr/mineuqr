/**
 * REVENUE-UNION-ADOPTION-1 — one authority per transaction (I-REV-U-01).
 * BOTH is never published. Duplicate identities collapse (idempotent).
 */

import type { CollectionFactPurpose } from "../../operational-session/payment/collection-fact/collectionFactContract";
import { COLLECTION_FACT_PURPOSES } from "../../operational-session/payment/collection-fact/collectionFactContract";
import type {
  CollectionFactEligibility,
  ResolvedRevenueContribution,
  RevenueUnionCollectionFact,
  RevenueUnionConflict,
  RevenueUnionLegacyFact,
} from "./revenueUnionContract";
import {
  checkOverlapKey,
  collectionContributionId,
  collectionSaleKey,
  legacyContributionId,
  legacySaleKeys,
} from "./revenueUnionIdentity";

const ISOLATED_PURPOSES = new Set<string>(COLLECTION_FACT_PURPOSES);

export function isCollectionFactRevenueEligible(
  purpose: CollectionFactPurpose,
  eligibility: CollectionFactEligibility
): boolean {
  if (eligibility === "none") return false;
  return ISOLATED_PURPOSES.has(purpose);
}

export type ResolvedRevenueUnionSets = Readonly<{
  contributions: readonly ResolvedRevenueContribution[];
  conflicts: readonly RevenueUnionConflict[];
  excludedLegacyIds: ReadonlySet<string>;
  excludedFactIds: ReadonlySet<string>;
}>;

function paidLegacy(fact: RevenueUnionLegacyFact): boolean {
  return fact.outcome === "paid";
}

export function resolveRevenueUnionSets(input: {
  legacy: readonly RevenueUnionLegacyFact[];
  facts: readonly RevenueUnionCollectionFact[];
  eligibility: CollectionFactEligibility;
}): ResolvedRevenueUnionSets {
  const conflicts: RevenueUnionConflict[] = [];
  const excludedLegacyIds = new Set<string>();
  const excludedFactIds = new Set<string>();

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
  for (const row of input.facts) {
    if (!isCollectionFactRevenueEligible(row.purpose, input.eligibility)) {
      continue;
    }
    const id = collectionContributionId(row);
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

  const factsBySale = new Map<string, string>();
  const factsByCheck = new Map<string, string>();
  for (const [id, fact] of factsById) {
    factsBySale.set(collectionSaleKey(fact), id);
    if (fact.checkId != null) {
      factsByCheck.set(
        checkOverlapKey({ restaurantId: fact.restaurantId, checkId: fact.checkId }),
        id
      );
    }
  }

  for (const [legacyId, legacy] of legacyById) {
    const checkKey = checkOverlapKey({
      restaurantId: legacy.restaurantId,
      checkId: legacy.checkId,
    });
    const factFromCheck = factsByCheck.get(checkKey);
    const overlappingSale = legacySaleKeys(legacy).find((key) =>
      factsBySale.has(key)
    );
    const factFromSale = overlappingSale
      ? factsBySale.get(overlappingSale)
      : undefined;
    const factId = factFromCheck ?? factFromSale;
    if (factId && paidLegacy(legacy)) {
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
      contributionId: id,
      saleKey: legacySaleKeys(legacy)[0] ?? null,
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
      amount: fact.amount,
      taxAmount: fact.taxAmount,
      currencyCode: fact.currencyCode,
      businessDay: fact.businessDay,
      outcome: "paid",
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

  return { contributions, conflicts, excludedLegacyIds, excludedFactIds };
}

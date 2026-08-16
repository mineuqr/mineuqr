/**
 * COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1
 * Idempotent Always-On preservation seed for catalog-promoted Projection IDs.
 *
 * Does NOT invent Basic=OFF / Professional=ON packaging.
 * Adds missing keys as included=true on existing Live Plan bundles only.
 *
 * Do not run against Production from this program.
 */

import { CATALOG_PROMOTED_PROJECTION_IDS } from "@shared/commercial-projection";
import { assertCommercialCapabilityFilterKeys } from "@shared/commercial-capability";
import { commercialCatalogStore } from "./CatalogStore";
import { FeatureBundleService } from "./index";

export const CATALOG_PROMOTED_SEED_KEYS = CATALOG_PROMOTED_PROJECTION_IDS;

export type CatalogPromotedSeedResult = {
  bundlesTouched: number;
  keysInserted: number;
  alreadyPresent: number;
};

export function seedCatalogPromotedCapabilitiesOnLivePlanBundles(
  store: typeof commercialCatalogStore = commercialCatalogStore
): CatalogPromotedSeedResult {
  const check = assertCommercialCapabilityFilterKeys([
    ...CATALOG_PROMOTED_PROJECTION_IDS,
  ]);
  if (!check.ok) {
    throw new Error(
      `Catalog-promoted keys are not Projection filter keys: ${check.invalid.join(", ")}`
    );
  }

  const liveBundleIds = new Set<string>();
  for (const plan of Array.from(store.plans.values())) {
    if (plan.featureBundleId) liveBundleIds.add(plan.featureBundleId);
  }

  const bundles = new FeatureBundleService(store);
  let bundlesTouched = 0;
  let keysInserted = 0;
  let alreadyPresent = 0;

  for (const bundleId of Array.from(liveBundleIds)) {
    const existing = bundles.listFeatures(bundleId);
    const included = new Set(
      existing.filter((f) => f.included).map((f) => f.featureKey)
    );
    let changed = false;
    for (const key of CATALOG_PROMOTED_PROJECTION_IDS) {
      if (included.has(key)) {
        alreadyPresent += 1;
        continue;
      }
      included.add(key);
      keysInserted += 1;
      changed = true;
    }
    if (changed) {
      bundles.replaceIncludedFeatures(bundleId, Array.from(included));
      bundlesTouched += 1;
    }
  }

  return { bundlesTouched, keysInserted, alreadyPresent };
}

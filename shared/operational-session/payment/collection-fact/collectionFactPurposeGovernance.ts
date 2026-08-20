/**
 * PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1
 * Production purpose governance. Distinct from Cashier adoption.
 */

import {
  COLLECTION_FACT_ISOLATED_PURPOSES,
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  type CollectionFactPurpose,
} from "./collectionFactContract";

export function isCollectionFactIsolatedPurpose(
  purpose: CollectionFactPurpose
): boolean {
  return (COLLECTION_FACT_ISOLATED_PURPOSES as readonly string[]).includes(
    purpose
  );
}

export function isCollectionFactProductionPurpose(
  purpose: CollectionFactPurpose
): boolean {
  return purpose === COLLECTION_FACT_PRODUCTION_PURPOSE;
}

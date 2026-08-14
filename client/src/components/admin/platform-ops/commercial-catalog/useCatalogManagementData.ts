/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Shared catalog query bundle + invalidation for management panels.
 */

import { trpc } from "@/lib/trpc";
import { catalogManagementUiObservability } from "./catalogManagementObservability";

export function useCatalogManagementData() {
  const utils = trpc.useUtils();

  const healthQuery = trpc.commercialCatalog.health.useQuery(undefined, {
    refetchInterval: 20_000,
  });
  const adoptionQuery = trpc.commercialCatalog.adoptionStatus.useQuery();
  const plansQuery = trpc.commercialCatalog.listPlans.useQuery();
  const pricesQuery = trpc.commercialCatalog.listPrices.useQuery();
  const cyclesQuery = trpc.commercialCatalog.listBillingCycles.useQuery();
  const bundlesQuery = trpc.commercialCatalog.listFeatureBundles.useQuery();
  const limitsQuery = trpc.commercialCatalog.listLimitProfiles.useQuery();
  const trialsQuery = trpc.commercialCatalog.listTrialPolicies.useQuery();
  const regionsQuery = trpc.commercialCatalog.listRegions.useQuery();
  const promotionsQuery = trpc.commercialCatalog.listPromotions.useQuery();
  const migrationQuery = trpc.commercialCatalog.listMigrationPolicies.useQuery();

  async function invalidateAll() {
    await Promise.all([
      utils.commercialCatalog.health.invalidate(),
      utils.commercialCatalog.adoptionStatus.invalidate(),
      utils.commercialCatalog.listPlans.invalidate(),
      utils.commercialCatalog.listPrices.invalidate(),
      utils.commercialCatalog.listBillingCycles.invalidate(),
      utils.commercialCatalog.listFeatureBundles.invalidate(),
      utils.commercialCatalog.listLimitProfiles.invalidate(),
      utils.commercialCatalog.listTrialPolicies.invalidate(),
      utils.commercialCatalog.listRegions.invalidate(),
      utils.commercialCatalog.listPromotions.invalidate(),
      utils.commercialCatalog.listMigrationPolicies.invalidate(),
    ]);
  }

  function trackCrud(ok: boolean, error?: string) {
    catalogManagementUiObservability.recordCrud(ok, error);
  }

  return {
    utils,
    invalidateAll,
    trackCrud,
    healthQuery,
    adoptionQuery,
    plansQuery,
    pricesQuery,
    cyclesQuery,
    bundlesQuery,
    limitsQuery,
    trialsQuery,
    regionsQuery,
    promotionsQuery,
    migrationQuery,
  };
}

export type CatalogManagementData = ReturnType<typeof useCatalogManagementData>;

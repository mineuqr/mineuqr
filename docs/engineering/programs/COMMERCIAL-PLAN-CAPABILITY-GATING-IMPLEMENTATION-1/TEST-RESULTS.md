# TEST RESULTS

**Date:** 2026-08-16

## Targeted suite

```
pnpm exec vitest run
  requireRestaurantPlanFeature.test.ts
  planCapabilityGating.matrix.test.ts
  seedCatalogPromotedCapabilities.test.ts
  planCapabilityGating.guards.test.ts
  commercialCapabilityOperationalValidation.test.ts
  commercialProjectionGeneration.guards.test.ts
  legacyCompatibilityRetirement.guards.test.ts
  commercialCatalogRationalization.guards.test.ts
  commercialCapabilityPlatformAdoption.guards.test.ts
  screenNavigationEntitlement.guards.test.ts
  featureVisibility.test.ts
  commercialCapabilityExperience.guards.test.ts
  routers.test.ts
  platformOwnerAccess.entitlements.test.ts
```

**Result:** 14 files, **148 passed**, 0 failed.

## Build

`pnpm build` — **PASS** (exit 0)

## Check

`pnpm check` — **FAIL** (pre-existing). Dominant class: TS2802 `downlevelIteration` on Map/Set spreads across commercial-catalog persistence, data-retention, reporting, and other files. This program introduced three TS2802 sites in the seed file and **fixed them** with `Array.from`. Remaining check failures are not caused by this program.

## Governance / architecture guards

Projection length 19, catalog-promoted packaging, Plan Editor unlock, router `requireRestaurantPlanFeature`, no `isSubscriptionActive` design grant, no plan-name authorization — **PASS**.

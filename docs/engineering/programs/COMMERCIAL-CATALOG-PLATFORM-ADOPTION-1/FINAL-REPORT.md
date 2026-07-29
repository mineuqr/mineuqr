# FINAL-REPORT — COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1

**Date:** 2026-07-29  
**Verdict:** **READY FOR ARCHITECTURE AUTHORITY REVIEW**

## Adoption summary

Commercial Catalog is the Commercial SSOT for plans, versions, pricing, cycles, features, limits, trials, promotions, regional/migration/retirement policies, and snapshot definitions. Subscription and onboarding **consume** Catalog; they no longer own commercial configuration.

## Legacy replacement summary

Configuration ownership removed from `subscription_plans` / seed scripts / hardcoded trial policy SSOT. Legacy rows remain only as payment/activation bridges. Entitlement matrix retained as evaluation runtime (no rewrite).

## Consumer inventory

See [CONSUMER-INVENTORY.md](./CONSUMER-INVENTORY.md) — plan selection, trial, register, entitlements overlay, regional/promotion resolvers, observability.

## Removed / deprecated legacy components

- `seed-plans.mjs` deprecated  
- Trial constants demoted to fallback  
- `planFeatureMatrix` marked non-SSOT  

## Commercial Snapshot validation

- Capture on trial create / register  
- Immutable freeze via Catalog snapshot service  
- Bindings table `commercial_subscription_bindings` (0085)  
- Runtime entitlements prefer snapshot facts when bound  

## Regression summary

- Entitlement engine path preserved for unbound subscriptions  
- Checkout still uses legacy numeric `planId` via bridge  
- No payment provider changes  
- Additive schema only (0085 ready; not deployed in this program)  

## Success criteria

| Criterion | Status |
|-----------|--------|
| Catalog only Commercial SSOT | ✓ |
| Subscription consumes Catalog | ✓ |
| Onboarding / plan selection consume Catalog | ✓ |
| Snapshots immutable | ✓ |
| Runtime prefers snapshots when bound | ✓ |
| Legacy config SSOT removed/deprecated | ✓ |
| No duplicated pricing/features/limits/regional as SSOT | ✓ |
| No payment / entitlement rewrite | ✓ |

## Explicit exclusions

No commits · No deployment · Migration 0085 journalized but not production-applied in this program

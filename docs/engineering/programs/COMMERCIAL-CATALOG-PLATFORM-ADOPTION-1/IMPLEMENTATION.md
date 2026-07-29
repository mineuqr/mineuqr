# IMPLEMENTATION — COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1

**Date:** 2026-07-29  

## What changed

| Area | Change |
|------|--------|
| Catalog persistence | Hydrate/persist `commercial_*` via Drizzle; seed published bridge offerings when empty |
| Legacy bridge | `legacyPlanBridge.ts` maps 30001–30003 ↔ catalog codes |
| Plan selection | `subscription.listPlans` dual-reads Catalog (published only) with legacy fallback |
| Trial activation | Trial duration + plan from Catalog; snapshot captured on trial create / register |
| Snapshot binding | Table `commercial_subscription_bindings` (migration **0085**) |
| Feature/limit runtime | `getCommercialEntitlements` prefers bound Commercial Snapshot facts |
| Observability | `commercialCatalog.adoptionStatus` + counters (legacy lookups, snapshots, errors) |
| Bootstrap | Server start calls `ensureCatalogReady()` |

## Migration

`drizzle/0085_commercial_catalog_adoption_bindings.sql` — additive bindings table. Journal terminus advanced (not executed in this program — no deployment).

## Prohibited (honored)

No Stripe/Moyasar/HyperPay · No invoice · No entitlement matrix rewrite · Snapshots immutable after capture

# IMPLEMENTATION — COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1

**Date:** 2026-07-29  
**Type:** Platform Foundation  
**ADR:** ADR-ARCH-037

## Packages

| Layer | Path |
|-------|------|
| Shared contracts / types | `shared/commercial-catalog/` |
| Schema aggregates | `server/db/schema/commercial/` |
| Services | `server/services/commercial-catalog/` |
| tRPC API | `server/api/commercialCatalog/` |
| Server barrel | `server/commercial-catalog/` |
| Platform Ops UI | `client/.../PlatformOpsCommercialCatalogComposition.tsx` |
| Migration | `drizzle/0084_commercial_catalog_foundation.sql` |

## Domain aggregates

`commercial_plans` · `commercial_plan_versions` · `commercial_prices` · `commercial_billing_cycles` · `commercial_feature_bundles` · `commercial_bundle_features` · `commercial_limit_profiles` · `commercial_limit_values` · `commercial_trial_policies` · `commercial_promotions` · `commercial_regions` · `commercial_publication_rules` · `commercial_migration_policies` · `commercial_retirement_policies` · `commercial_snapshot_definitions`

**No subscription tables.**

## Runtime note

Foundation services use an in-process Catalog store aligned to the production schema. Migration `0084` journals the normalized tables for DB adoption. Snapshot **definitions** are Catalog-owned; Subscription Platform persists customer snapshots at activation (CC-13).

## API

`trpc.commercialCatalog.*` — admin-only CRUD + publication + snapshot capture. No Subscription APIs. No payment APIs.

## UI

`/admin/platform/commercial-catalog` — Platform Ops live section. platform-ops-ui reuse only.

## Laws enforced

CC-02 immutability · CC-13 snapshot contract · CC-14 compatibility fields · CC-15 regional policies · CC-16 publication gate

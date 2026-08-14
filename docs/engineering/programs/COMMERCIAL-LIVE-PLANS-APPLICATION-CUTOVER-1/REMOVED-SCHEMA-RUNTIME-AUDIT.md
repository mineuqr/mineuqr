# REMOVED-SCHEMA-RUNTIME-AUDIT.md

Dropped after 0086 (confirmed ABSENT on production):

- `commercial_plan_versions`
- `commercial_snapshot_definitions`
- `commercial_publication_rules`
- `commercial_retirement_policies`

Drizzle live schema (`server/db/schema/commercial/tables.ts`, `bindings.ts`) has **no** `planVersionId`, `snapshotId`, or version tables. Hydration (`drizzleCatalogPersistence.ts`) SELECTs only live aggregates: plans, prices, cycles, bundles, features, limits, trials, promotions, regions, migration policies.

## Classification legend

A dead code · B test-only · C documentation · D historical/audit · E legacy compatibility · F production runtime · G must remove before deploy

## Inventory (production-executable code)

| Reference | Location | Class | Can execute in production? | Notes |
|-----------|----------|-------|----------------------------|-------|
| `hydrateCommercialCatalogFromDb` | `drizzleCatalogPersistence.ts` | F | Yes | Live tables only |
| `persistLivePlan` / `persistFullCatalog` | `livePlanPersistence.ts` | F | Yes | Live tables only |
| `commercialSubscriptionBindings.planId` | `bindings.ts` | F | Yes | Live bind; 0 rows today |
| `loadBoundLivePlan` | `snapshotLoader.ts` | F | Yes | **Filename leftover.** Loads live plan via `resolveLivePlanCapabilities`. No snapshot SQL. |
| `getCommercialEntitlements` | `getCommercialEntitlements.ts` | F | Yes | Delegates to runtime; bound=live, unbound=legacy |
| `ensureCatalogReady` | `adoptionService.ts` + `_core/index.ts` | F | Yes | Hydrate live catalog; bootstrap only if empty |
| `saveLive` | `PlanService.saveLive` | F | Yes | Persist + invalidate caches |
| `listPublicCatalogOfferings` | `publicCatalogReadModel.ts` | F | Yes | Live plans, not hidden |
| `subscription.listPlans` | `routers.ts` | F | Yes | Prefers live catalog when `legacyPlanId` present; else `subscription_plans` |
| `createCheckoutSession` | `routers.ts` | F | Yes | `getSubscriptionPlanById` only |
| `bindSubscriptionToLivePlan` | `adoptionService.ts` | F (write on **new** checkout/trial/admin) | Yes | Inserts **bindings** table, not snapshots. Not called on login. |
| `OPS_EVENT.commercial_snapshot_*` | `opsTaxonomy.ts` / bind audit | D | Event name leftover | Bind writes live binding; event names are historical |
| `recordSnapshotCreationFailure` | observability | D | Yes | Used for **live-plan unreadable** fail-closed, not snapshot I/O |
| `planFeatureMatrix` | `src/lib/commercial/planFeatureMatrix.ts` | E | Yes, **unbound only** | See entitlement audit |
| `getCommercialEntitlementsFromContext` | `src/lib/commercial/getCommercialEntitlements.ts` | E | Yes, unbound | Matrix from context; no catalog SQL |
| `lifecycleSync` `"draft"` | `entitlementResolver.ts` | E | Yes | **Subscription** lifecycle enum, not catalog draft |
| `commercial_plan_versions` SQL | `drizzle/0084_*.sql`, `0086_*.sql` | D | 0086 already applied | Historical migrations; 0086 must not be re-run |
| Guards expecting DROP | `commercialLivePlans.cleanReset.test.ts` | B | No | Asserts 0086 SQL |
| Architecture guard `not.toContain("commercial_plan_versions")` | schema test | B | No | Forbids table in current schema |
| `versionCompare.ts` | admin experience | A | Client util unused by production panels | Test-only import |
| `CapabilityLifecycleRail.tsx` | admin experience | A | **Not imported** by production UI | Leftover presentation |
| `stateLabel` draft/published/retired | `CatalogManagementPanels.tsx` | A | Defined, **never called** | Leftover i18n map |
| `featuresFromSnapshot` strings | `legacyRetirement.ts` | C | No | Retirement registry of **legacy feature keys**, not SQL |
| `computeSnapshotFingerprint` | `CommercialReportService` | D | Yes | SHA of **KPI report** payload, not catalog snapshot |
| Program SELECT scripts | `docs/engineering/programs/**` | C | Manual only | Not in app runtime |
| 0085 probe scripts | prior program folders | C | Manual only | Pre-0086 probes |

## Production runtime dependency on dropped tables

**None.** Class G is empty.

No Drizzle table, SQL string, or SELECT in `server/` (excluding tests and historical SQL files) targets the four dropped tables.

## Overlay check

There is **no** `Legacy Matrix + Live Plan overlay`. Bound and unbound are exclusive branches in `resolveOwnerEntitlements`.

# RUNTIME-AUTHORITY-AUDIT.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14

## Canonical bound path (proven)

```
getCommercialEntitlements(ownerId)
  → resolveOwnerEntitlements
      → pickUserLevelSubscription (restaurantId = 0)
      → loadBoundLivePlan(subscriptionId)
          → getSubscriptionCommercialBinding  (DB)
          → resolveLivePlanCapabilities
              → planService.get(binding.planId)          // live plan
              → bundleFeatures where included            // live capabilities
              → limitValues                              // live limits
              → binding.chargedAmount*                   // period price
      → resolveEntitlementsFromLivePlan
```

Files:

- `server/commercial/getCommercialEntitlements.ts`
- `server/subscription-runtime/subscriptionRuntimeService.ts`
- `server/subscription-runtime/snapshotLoader.ts` (name leftover; loads **live** plan)
- `server/services/commercial-catalog/adoptionService.ts` (`resolveLivePlanCapabilities`)
- `server/subscription-runtime/entitlementResolver.ts`

## Unbound path (second authority)

If no account-level subscription **or** binding row is missing:

```
buildCommercialContextFromDb → getCommercialEntitlementsFromContext → planFeatureMatrix
meta.commercialResolutionSource = "legacy_bridge"
```

This **can** grant different features than the live Professional/Basic/Enterprise bundles.

`getSubscriptionCommercialBinding` swallows all DB errors and returns `null`. An unknown-column failure (pre-0086 schema) therefore looks like “unbound” and silently uses the legacy matrix.

## Bound + unreadable live plan

`denyEntitlementsFailClosed` → `plan: NONE`, zero limits. Correct fail-closed. Risk: after 0086, a binding whose `planId` does not match a hydrated live plan **locks the subscriber out**.

## Remaining reference classification

| Reference | Location | Class |
|-----------|----------|-------|
| `loadBoundLivePlan` in `snapshotLoader.ts` | Runtime load of live plan | **B** leftover filename; behavior is live-plan |
| `commercial_snapshot_*` OPS events | `opsTaxonomy.ts`, `adoptionService.auditEventForBind` | **B** audit event names; not a snapshot payload |
| `recordSnapshotResolved` / `recordSnapshotCreationFailure` | `runtimeAuthorityObservability.ts` | **B** metric names wrapping live-plan counts |
| `CommercialReadService` checks `commercialResolutionSource === "snapshot"` | `server/commercial/CommercialReadService.ts` | **D** production display path — **stale**; live_plan names ignored |
| `planFeatureMatrix` | unbound entitlements + bootstrap seed | **B** unbound runtime; **B** bootstrap seed vocabulary |
| `LEGACY_PLAN_BRIDGE` | bind by `legacyPlanId` 30001–30003 | **B** payment/activation bridge; does not freeze capabilities |
| `subscription_plans` prices | `routers.ts` checkout + `createInvoice` | **A** financial/checkout SSOT (unchanged; not live catalog) |
| `versionCompare.ts` | admin experience leftover | **C** dead versioning UI helper still on disk |
| `CapabilityLifecycleRail.tsx` | admin experience | **C** unused after panel strip (import removed from panels) |
| Connector `publishedAt` / Order outbox `publishedAt` | connector-product, order events | **A** unrelated domains |
| `hydrateCommercialSnapshotById` | — | **gone** |
| `snapshotRuntimeAuthority.ts` | — | **gone** |
| `CommercialSnapshotDefinition` | — | **gone** from TS |
| `planVersionId` on bindings/prices (code schema) | Drizzle commercial schema | **gone from code**; **still on production DB** until 0086 |
| Invoice `amount` | `invoices` table | **A** financial immutability |

## Entitlement callers

All commercial access checked goes through `getCommercialEntitlements` / `resolveOwnerEntitlements` / `hasFeature`:

- `server/commercial/router.ts`
- `CommercialReadService`
- `wave1ReadAuthority`
- `guestOrderingAuthority` (`hasFeature("ordering")`)
- `subscriptionPlanLimits.resolvePlanLimitsForUser` (bound → `resolveLivePlanCapabilities`; unbound → `subscription_plans`)

No caller still loads a commercial snapshot payload for features/limits.

## Feature freeze

For a **bound** standard plan: capabilities are always the **current** live bundle. There is no snapshot freeze. Confirmed by AA validation test (kitchen added → both A and B grant kitchen without rebind).

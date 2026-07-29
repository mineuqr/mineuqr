# RESOLVER-INVENTORY

**Program:** COMMERCIAL-SNAPSHOT-ENTITLEMENT-SSOT-VERIFICATION-1  
**Classification legend:** A Snapshot Only · B Legacy Bridge · C Mixed · D Catalog Runtime  

---

## Primary commercial entitlement pipeline

| ID | Resolver / entry | Path | Reads when Snapshot exists | Class |
|----|------------------|------|----------------------------|-------|
| R01 | `getCommercialEntitlements` (server) | `server/commercial/getCommercialEntitlements.ts` | **Always** builds base via Legacy matrix, then **overlays** Snapshot features/limits | **C** |
| R02 | `getCommercialEntitlementsFromContext` | `src/lib/commercial/getCommercialEntitlements.ts` | N/A (pure); fed by R01 legacy context | **B** |
| R03 | `resolveCommercialEntitlements` | `src/lib/commercial/resolveCommercialEntitlements.ts` | Uses `planFeatureMatrix` only | **B** |
| R04 | `buildCommercialContextFromDb` | `server/commercial/buildCommercialContextFromDb.ts` | `user_subscriptions` + `mapPlanIdToCatalogPlan` (legacy) | **B** |
| R05 | `resolveCommercialFactsFromSnapshot` | `server/services/commercial-catalog/adoptionService.ts` | Snapshot binding + in-memory snapshot payload | **A** (facts helper only; not exclusive authority) |

---

## Feature / ordering / trial consumers

| ID | Resolver / entry | Decision | Class |
|----|------------------|----------|-------|
| R06 | `resolveGuestOrderingAllowed` | → R01 → `features.ordering` | **C** (inherits R01) |
| R07 | `trpc.commercial.getEntitlements` | → R01 | **C** |
| R08 | `useCommercialEntitlements` (client) | → R07 | **C** |
| R09 | `useCommercialFeatureVisibility` / gates | → R08 | **C** |
| R10 | `CommercialReadService.getOwnerCommercialState` | → R01 + **legacy** `getSubscriptionPlanById` for display | **C** |
| R11 | `resolveTrialStatusRead` | → R01 then **fallback** `isSubscriptionActive` / `getTrialEndDate` | **C** |

---

## Limit / quota enforcement

| ID | Resolver / entry | Decision | Class |
|----|------------------|----------|-------|
| R12 | `resolvePlanLimitsForUser` | **Always** `subscription_plans.max*` — never Snapshot | **B**† |
| R13 | `assertRestaurantCreateAllowed` / item/category asserts | → R12 | **B**† |

† For **bound** subscriptions this is an architecture violation (Legacy after Snapshot exists). Classifier remains **B** for the codepath; bound usage = non-compliant application of B.

---

## Period / permission-adjacent (not feature matrix)

| ID | Resolver / entry | Decision | Class |
|----|------------------|----------|-------|
| R14 | `isSubscriptionActive` / `userHasSubscriptionEntitlement` | Period/status only on `user_subscriptions` | **B** (lifecycle) |
| R15 | Template / color / font gates in `routers.ts` | → R14 only | **B** |

---

## Catalog configuration (must not be runtime entitlement authority)

| ID | Resolver / entry | Decision | Class |
|----|------------------|----------|-------|
| R16 | `listPublishedPlanOfferings` / `subscription.listPlans` dual-read | Live Catalog (+ legacy fallback) for **selection/pricing UI** | **D** if used as entitlement; **UI config** (out of entitlement SSOT) |
| R17 | `ensureCatalogReady` / hydrate Catalog | Live Catalog store | **D** (config SSOT, not bound entitlement) |
| R18 | Platform Ops `commercialCatalog.*` | Live Catalog admin | **D** (admin config) |

---

## Activation / upgrade / downgrade / renewal / trial

| ID | Flow | Snapshot capture? | Runtime resolution after bind | Class |
|----|------|-------------------|-------------------------------|-------|
| F01 | Trial `createTrialSubscription` | Yes (best-effort) | Subsequent reads via R01 (**C**) | Capture OK; resolve **C** |
| F02 | Register `registerOwner` | Yes (best-effort) | → R01 (**C**) | Capture OK; resolve **C** |
| F03 | PayPal / Tap activation | **No** Snapshot capture found | Legacy planId only → R01/R12 | **B** / gap |
| F04 | Admin create/update subscription | **No** Snapshot capture found | Legacy → R01/R12 | **B** / gap |
| F05 | Upgrade / Downgrade / Renewal | Helper exists; **no call sites** in payment/admin upgrade paths | N/A | Gap → unbound or stale bind |

---

## Summary counts

| Class | Count (resolvers R01–R18) |
|-------|---------------------------|
| **A** | 1 (R05 helper only) |
| **B** | 8 (+ quota paths) |
| **C** | 7 (including R01 hub) |
| **D** | 3 (Catalog config surfaces) |

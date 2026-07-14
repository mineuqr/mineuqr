# QR-ORDERING-RUNTIME-MIGRATION-1 — QR Ordering Runtime Migration
## Phase C — Certification Report

**Program:** QR-ORDERING-RUNTIME-MIGRATION-1  
**Type:** Platform Adoption  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

QR Ordering now consumes `OrderingRuntimeContext` via additive `ordering.getRuntimeBySlug`. Local hours/guest gate assembly and menu list fan-out were removed from `MenuView` / `CheckoutPage`. Session recovery and post-submission remain channel concerns. Place-order mutation authority is unchanged. No UI redesign, routing changes, or database changes.

---

## 2. Migration Report

| Before | After |
|--------|-------|
| `restaurant.getBySlug` + 4 list queries + `order.canOrder` + client `isRestaurantOpen` | `ordering.getRuntimeBySlug` → runtime + presentation |
| Client-composed `canOrder` / `orderingAllowed` | `deriveQrOrderingRuntimeGates(runtime)` |
| Menu payloads from discrete queries | `runtime.menu.*` |

**Preserved:** Templates, cart drawer, checkout form, session recovery, post-submission lock, `order.create`.

---

## 3. Files Changed

| File | Change |
|------|--------|
| `server/ordering-platform/loadQrOrderingRuntimeSources.ts` | **New** QR source loader |
| `server/ordering-platform/getQrOrderingRuntime.ts` | **New** materialize delivery |
| `server/orderingRouter.ts` | **New** additive router |
| `server/routers.ts` | Mount `ordering` |
| `server/ordering-platform/OrderingRuntimeMaterializer.ts` | Hours gate on place-order |
| `server/ordering-platform/orderingPlatformOwnership.ts` | QR loader/router registry |
| `client/src/hooks/useQrOrderingRuntime.ts` | **New** consumer hook |
| `client/src/lib/ordering-platform/qrOrderingRuntimeConsumer.ts` | Gate derivation |
| `client/src/pages/MenuView.tsx` | Runtime consumer |
| `client/src/pages/CheckoutPage.tsx` | Runtime consumer |
| `client/src/lib/ordering-platform/qrOrderingChannelContract.ts` | Consumption entry |
| Guards + unit tests | **New** / updated |
| Docs | This program folder |

---

## 4. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| QR is Ordering Platform client | ✓ |
| OrderingRuntimeContext is runtime source | ✓ |
| No duplicated gate assembly on QR pages | ✓ |
| No customer-visible redesign | ✓ |
| No API breaking changes (additive only) | ✓ |
| No DB / operational changes | ✓ |

---

## 5. Validation Report

| Check | Result |
|-------|--------|
| `npm test -- server/ordering-platform client/src/lib/ordering-platform shared/ordering-platform` | **53/53 Pass** |
| `npm run build` | **Pass** |

---

QR-ORDERING-RUNTIME-MIGRATION-1 establishes QR as the first production runtime consumer of the Ordering Platform.

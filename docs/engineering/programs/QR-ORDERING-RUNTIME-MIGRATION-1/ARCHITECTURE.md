# QR-ORDERING-RUNTIME-MIGRATION-1 — QR Ordering Runtime Migration
## Binding Architecture Document

**Program:** QR-ORDERING-RUNTIME-MIGRATION-1  
**Type:** Platform Adoption  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-14  
**Depends on:** ORDERING-PLATFORM-ARCHITECTURE-1, ORDERING-RUNTIME-CONTEXT-1, ORDERING-RUNTIME-MATERIALIZATION-1

---

## 1. Vision

Migrate QR Ordering to consume `OrderingRuntimeContext` as the first production Ordering Platform client.

**Change the source. Do not change the behavior.**

---

## 2. Migration Architecture

```
Before                              After
QR                                  QR
 ↓                                   ↓
Local fan-out + hours/guest gates   ordering.getRuntimeBySlug
 ↓                                   ↓
UI                                  OrderingRuntimeContext
                                    ↓
                                    Presentation (unchanged UX)
```

---

## 3. Ownership

| Concern | Owner |
|---------|-------|
| Source load | `loadQrOrderingRuntimeSources` |
| Composition | `OrderingRuntimeMaterializer` |
| Construction | `OrderingRuntimeContextFactory` |
| Delivery | `ordering.getRuntimeBySlug` |
| Gate derivation (read-only) | `deriveQrOrderingRuntimeGates` |
| Session / journey / UX | QR channel |
| Place order mutation | `order.create` → `PlaceOrderService` |

---

## 4. What QR Consumes From Runtime

| Runtime field | QR use |
|---------------|--------|
| `policies.guest.guestOrderingEnabled` | Guest entitlement |
| `business.hours.isOpenNow` / `closureActive` | Closed notice |
| `availability.canPlaceOrder` | Platform place-order gate |
| `menu.categories/products/offers/availability` | Menu projections (+ holidays) |
| `restaurantPresentation` | Display-only template props |

Channel concerns (session recovery, post-submission) stay outside the runtime snapshot.

---

## 5. Additive API

`ordering.getRuntimeBySlug` — non-breaking new router namespace. Existing procedures remain.

---

## 6. Architecture Guards

| Guard | Rule |
|-------|------|
| QRM-01 | MenuView/Checkout use `useQrOrderingRuntime` |
| QRM-02 | Pages do not import hours helpers or `order.canOrder` |
| QRM-03 | MenuView does not fan-out list queries for runtime |
| QRM-04 | Loader does not compose/freeze |
| QRM-05 | Service materializes via materializer only |

---

## 7. Out of Scope

UI redesign, routing changes, cart/checkout redesign, payments, kiosk, operational runtime, DB redesign.

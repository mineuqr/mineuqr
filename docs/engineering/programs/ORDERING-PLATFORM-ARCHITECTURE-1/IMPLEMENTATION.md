# ORDERING-PLATFORM-ARCHITECTURE-1 — Ordering Platform Foundation
## Phase C — Certification Report

**Program:** ORDERING-PLATFORM-ARCHITECTURE-1  
**Type:** Core SaaS Architecture  
**Date:** 2026-07-13  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

ORDERING-PLATFORM-ARCHITECTURE-1 establishes MineuQR as a **Restaurant Ordering Platform** with QR as the first active ordering client. The program introduces shared platform contracts, server ownership registry, QR channel boundary, consolidated offer cart identity, architecture guards, and binding documentation. No QR redesign, kiosk implementation, API breaking changes, or operational runtime changes were made.

---

## 2. Problem Statement

QR ordering logic was embedded in monolithic routers and page-level gates. Future channels (Kiosk, Mobile, Waiter Tablet) would duplicate menu loading, pricing, validation, and place-order rules without a platform boundary.

---

## 3. Architecture Decision

**Decision:** Introduce `shared/ordering-platform/`, `server/ordering-platform/`, and `client/src/lib/ordering-platform/` as the formal platform layer. Business rules remain in existing authoritative modules (`PlaceOrderService`, `orderPricing.ts`); the platform layer documents ownership and provides contracts for future channel consumption.

**QR status:** Active ordering client — routes and UX unchanged.  
**Kiosk / Mobile / Waiter:** Registered as future channels in contracts only.

---

## 4. Runtime Architecture Summary

```
Restaurant → Ordering Platform → PlaceOrderService → Order Aggregate → Events → Operational Runtime
                     │
                     └── OrderingRuntimeContext (contract) → Channel Clients (QR today)
```

Ordering Runtime is **read-only** and **presentation-independent** (no orientation, screen size, or device type in business contracts).

---

## 5. Capability Audit

| Authority | Location | Status |
|-----------|----------|--------|
| Place order mutation | `PlaceOrderService` | Unchanged — sole entry |
| Authoritative pricing | `orderPricing.ts` | Unchanged |
| Offer cart identity | `@shared/ordering-platform/offerCartIdentity` | **Consolidated** |
| Guest entitlement | `guestOrderingAuthority.ts` | Unchanged |
| QR channel contract | `qrOrderingChannelContract.ts` | **New** |
| Operational runtime | Kitchen/Expo/Pickup | Out of scope — unchanged |

---

## 6. Presentation Audit

| Layer | Finding |
|-------|---------|
| QR (`MenuView`, `CheckoutPage`) | Experience only; uses existing tRPC + cart |
| `OrderingRuntimeContext` | No form-factor fields — presentation-independent ✓ |
| `ORDERING_FORM_FACTORS` | Documented as channel concern, not platform logic ✓ |

---

## 7. Files Changed

| File | Change |
|------|--------|
| `shared/ordering-platform/offerCartIdentity.ts` | Canonical offer cart ID |
| `shared/ordering-platform/orderingPlatformContracts.ts` | Channel + ownership contracts |
| `shared/ordering-platform/orderingRuntimeContract.ts` | Runtime context types |
| `shared/ordering-platform/index.ts` | Public exports |
| `shared/ordering-platform/__tests__/offerCartIdentity.test.ts` | Unit tests |
| `server/ordering-platform/orderingPlatformOwnership.ts` | Server authority registry |
| `server/ordering-platform/index.ts` | Public exports |
| `server/ordering-platform/__tests__/orderingPlatform.architecture.guards.test.ts` | Server guards |
| `client/src/lib/ordering-platform/qrOrderingChannelContract.ts` | QR channel boundary |
| `client/src/lib/ordering-platform/index.ts` | Public exports |
| `client/src/lib/ordering-platform/__tests__/orderingPlatform.architecture.guards.test.ts` | Client guards |
| `client/src/lib/offerCart.ts` | Re-export shared identity |
| `server/orderPricing.ts` | Import shared identity |
| `vitest.config.ts` | Include `shared/**/*.test.ts` in test runner |
| `docs/engineering/programs/ORDERING-PLATFORM-ARCHITECTURE-1/ARCHITECTURE.md` | Binding architecture |
| `docs/engineering/programs/ORDERING-PLATFORM-ARCHITECTURE-1/IMPLEMENTATION.md` | This report |

**Not modified:** QR pages, `routers.ts` behavior, order domain, operational runtime, database.

---

## 8. Regression Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `shared/ordering-platform/__tests__/offerCartIdentity.test.ts` | 2 | Pass |
| `server/ordering-platform/__tests__/orderingPlatform.architecture.guards.test.ts` | 5 | Pass |
| `client/src/lib/ordering-platform/__tests__/orderingPlatform.architecture.guards.test.ts` | 5 | Pass |
| `client/src/lib/offerCart.test.ts` | Existing | Pass (via re-export) |
| `server/order-create-offer-pricing.test.ts` | Existing | Pass |

---

## 9. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Ordering Platform is single architectural owner of ordering | ✓ (contracts + registry) |
| QR is an Ordering Client | ✓ |
| Future Kiosk/Mobile registered as clients | ✓ |
| Business rules exist once (pricing, place order) | ✓ |
| Ordering Runtime contract is reusable | ✓ |
| No duplicated offer cart identity | ✓ |
| Presentation-independent platform | ✓ |
| No production regressions | ✓ |
| No API changes | ✓ |
| No scope creep | ✓ |

---

## 10. Future Work (Explicitly Deferred)

- Unified guest menu projection service
- Full `OrderingRuntimeContext` materialization endpoint
- Guest ordering eligibility consolidation (`MenuView` / `CheckoutPage`)
- `GuestPlaceOrderOrchestrator` extraction from `routers.ts`
- Kiosk channel implementation

---

ORDERING-PLATFORM-ARCHITECTURE-1 Phase C satisfies all success criteria. The platform foundation is established; QR remains the active client with unchanged behavior; future channels have a documented path to consume shared runtime contracts without duplicating business logic.

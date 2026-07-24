# ORDERING-PLATFORM-ARCHITECTURE-1 — Ordering Platform Architecture
## Binding Architecture Document

**Program:** ORDERING-PLATFORM-ARCHITECTURE-1  
**Type:** Core SaaS Architecture  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-13

---

## 1. Vision

MineuQR is a **Restaurant Ordering Platform**. QR Ordering, Self Ordering Kiosk, future Mobile Ordering, and future Waiter Tablet Ordering are **clients** of a single Ordering Platform.

No ordering channel may own business logic. Business logic belongs exclusively to the Ordering Platform.

---

## 2. Architecture Decision

Introduce a single **Ordering Platform** layer between restaurants and ordering channels.

```
Restaurant
        │
        ▼
Ordering Platform          ← business rules, validation, pricing, place order
        │
        ▼
Ordering Runtime           ← immutable read-only context for clients
        │
        ▼
Ordering Projection        ← menu, categories, products, modifiers, availability
        │
   ┌────┴────┬──────────┬─────────────┐
   ▼         ▼          ▼             ▼
 QR Client  Kiosk     Mobile App   Waiter Tablet
 (active)  (future)   (future)      (future)
```

Every channel consumes the same Ordering Runtime. No channel owns ordering business rules.

---

## 3. Platform Responsibilities

The Ordering Platform owns:

| Concern | Current authority (Phase 1) |
|---------|----------------------------|
| Restaurant ordering context | `routers.ts` + `guestOrderingAuthority.ts` |
| Business availability / hours | `@shared/utils/restaurantHours`, router guards |
| Menu projection | DB queries (Phase 2: unified projection) |
| Category hierarchy | DB + future projection |
| Product / modifier projection | DB + future projection |
| Availability rules | `orderPricing.ts`, menu `isAvailable` |
| Price calculation | `orderPricing.ts` → `PlaceOrderService` |
| Cart validation | `orderPricing.ts` |
| Checkout validation | `order.create` router guards |
| PlaceOrder orchestration | `PlaceOrderService` |
| Ordering events | Order domain + outbox |

---

## 4. Channel Responsibilities

Channels own **experience only**:

| Channel | Owns | Does NOT own |
|---------|------|--------------|
| **QR** | Mobile/table layout, table context UX, responsive presentation | Pricing, validation, place order logic |
| **Kiosk** (future) | Large-screen UX, idle screen, language selection flow | All platform concerns |
| **Mobile** (future) | Native UX, push integration | All platform concerns |
| **Waiter Tablet** (future) | Staff interaction flow | All platform concerns |

Contract: `client/src/lib/ordering-platform/qrOrderingChannelContract.ts`

---

## 5. Multi-Form Factor Architecture

The Ordering Platform is **presentation-independent**.

The same Ordering Runtime powers:

- Mobile phones
- Tablets
- Portrait / landscape kiosks
- Counter touch screens
- Table touch displays
- Large interactive displays

**Screen orientation, size, and input method never affect ordering logic.**

Portrait and landscape are presentation concerns only. Touch is primary; mouse/keyboard remain compatibility inputs.

Form factors are enumerated in `ORDERING_FORM_FACTORS` (`shared/ordering-platform/orderingPlatformContracts.ts`) as documentation — they do not appear in runtime business types.

---

## 6. Ordering Runtime Model

The Ordering Runtime produces an **immutable, read-only** context for clients:

```typescript
OrderingRuntimeContext {
  channel, restaurant, business, availability,
  presentation, menu, policies, pricing
}
```

Contract: `shared/ordering-platform/orderingRuntimeContract.ts`

Clients never calculate business rules locally. Display totals may be computed for UX; authoritative pricing occurs only at place order.

---

## 7. Place Order Flow

Every ordering channel converges here:

```
Cart (channel)
        │
        ▼
Ordering Platform
        │
        ▼
PlaceOrderService          ← server/order/application/PlaceOrderService.ts
        │
        ▼
Order Aggregate            ← server/order/domain/aggregate/Order.ts
        │
        ▼
Order Events / Outbox
        │
        ▼
Operational Runtime      ← Kitchen, Expo, Pickup (separate bounded context)
```

**No ordering channel talks directly to Kitchen.**  
**No ordering channel owns Order lifecycle.**

Current production entry: `trpc.order.create` → `placeOrderService.execute()`

---

## 8. Projection Architecture

| Projection | Owner | Consumer |
|------------|-------|----------|
| Guest menu browse | Platform (Phase 2 unified DTO) | QR, Kiosk, Mobile |
| Order read (post-place) | `server/order/read/projections/` | Kitchen, Expo, Pickup, Workspace |
| Category (order lines) | `OrderCategoryProjectionBuilder` | Operational runtime |
| Offer (order lines) | `OrderOfferProjectionBuilder` | Operational runtime |

Guest menu and order read projections are **separate today**. Phase 2 will unify guest menu under platform projection without breaking QR routes.

---

## 9. Channel Responsibility Matrix

| Concern | Platform | QR | Kiosk | Mobile | Waiter |
|---------|----------|-----|-------|--------|--------|
| Price calculation | ✓ | | | | |
| Cart validation | ✓ | | | | |
| Place order | ✓ | | | | |
| Menu browse data | ✓ | | | | |
| Responsive layout | | ✓ | ✓ | ✓ | ✓ |
| Table context UX | | ✓ | | | ✓ |
| Idle screen | | | ✓ | | |
| Language selection UX | | ✓ | ✓ | ✓ | ✓ |
| Orientation handling | | ✓ | ✓ | ✓ | ✓ |

---

## 10. Shared Contracts (Phase 1)

| Module | Purpose |
|--------|---------|
| `shared/ordering-platform/offerCartIdentity.ts` | Canonical offer cart line ID encoding |
| `shared/ordering-platform/orderingPlatformContracts.ts` | Channel IDs, ownership matrices |
| `shared/ordering-platform/orderingRuntimeContract.ts` | Immutable runtime context types |
| `server/ordering-platform/orderingPlatformOwnership.ts` | Server authority registry |
| `client/src/lib/ordering-platform/qrOrderingChannelContract.ts` | QR channel boundary |

---

## 11. Architecture Guards

| Guard | Rule |
|-------|------|
| OP-01 | `PlaceOrderService` is sole order mutation authority |
| OP-02 | `order.create` calls `placeOrderService.execute`, not `db.createOrder` |
| OP-03 | `OFFER_CART_MENU_ITEM_ID_BASE` defined once in shared platform |
| OP-04 | Runtime contract has no orientation/screen-size fields |
| OP-05 | QR client does not import operational runtime |
| OP-06 | Platform/channel ownership lists are explicit and separate |

### Ordering Invariants

Normative catalog: [`docs/architecture/constitution/Ordering-Invariants.md`](../../../architecture/constitution/Ordering-Invariants.md) (`OI-*`).

| ID | Title |
|----|-------|
| **OI-RT-01** | Runtime Identity Continuity — journey `deviceSessionId` immutable across Browse→Confirmation |

---

## 12. Out of Scope (This Program)

Kiosk implementation, QR redesign, mobile app, payments, loyalty, coupons, reservations, printing, operational runtime changes, database redesign.

---

## 13. Future Programs

| Program | Builds on |
|---------|-----------|
| ORDERING-RUNTIME-1 | Full `OrderingRuntimeContext` materialization |
| GUEST-MENU-PROJECTION-1 | Unified platform menu projection |
| KIOSK-CHANNEL-1 | Kiosk client consuming platform runtime |
| ORDERING-ELIGIBILITY-1 | Consolidated eligibility service |

---

This document is the binding architecture for ORDERING-PLATFORM-ARCHITECTURE-1. All future ordering channels must consume the platform; no channel may introduce duplicated business logic.

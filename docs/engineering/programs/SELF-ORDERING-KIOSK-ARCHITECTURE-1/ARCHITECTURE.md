# SELF-ORDERING-KIOSK-ARCHITECTURE-1 — Self Ordering Kiosk Architecture
## Binding Architecture Document

**Program:** SELF-ORDERING-KIOSK-ARCHITECTURE-1  
**Type:** Ordering Channel Architecture  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-14  
**Depends on:** ORDERING-PLATFORM-ARCHITECTURE-1, ORDERING-RUNTIME-CONTEXT-1, ORDERING-RUNTIME-MATERIALIZATION-1, QR-ORDERING-RUNTIME-MIGRATION-1

---

## 1. Vision

Self Ordering Kiosk is the **second Ordering Platform client**.

It is **not** a standalone ordering system. It owns customer experience only. All business rules belong to the Ordering Platform. Order execution belongs to the Operational Platform (Kitchen / Expo / Pickup).

---

## 2. Architecture Decision

```
Restaurant
        │
        ▼
Ordering Platform
        │
        ▼
OrderingRuntimeMaterializer
        │
        ▼
OrderingRuntimeContextFactory
        │
        ▼
Immutable OrderingRuntimeContext
        │
        ▼
Self Ordering Kiosk Client   ← experience only
        │
        ▼
PlaceOrderService
        │
        ▼
Operational Platform (Kitchen / Expo / Pickup)
```

---

## 3. Ownership Matrix

| Concern | Owner |
|---------|-------|
| Business hours, availability, policies, pricing | Ordering Platform |
| Runtime composition / construction | Materializer / Factory |
| Runtime delivery | `ordering.getRuntimeBySlug` |
| Idle / welcome / language / browse / cart / checkout UX | Kiosk |
| Touch-first adaptive layout | Kiosk |
| Session isolation + automatic reset | Kiosk |
| Place order mutation | `PlaceOrderService` |
| Kitchen / Expo / Pickup | Operational Platform |

**Operational device role** `self_ordering_kiosk` may host the experience later. It is **not** an ordering business authority.

---

## 4. Runtime Consumption Model

- Kiosk consumes `OrderingRuntimeContext` only.
- Same delivery entry as QR: `ordering.getRuntimeBySlug`.
- Channel id in runtime: `kiosk`.
- Gate derivation: `deriveKioskOrderingRuntimeGates` (read-only mapping).
- Forbidden: construct, compose, mutate, recalculate, repository fan-out for runtime.

Contracts:
- `kioskOrderingChannelContract.ts`
- `kioskRuntimeConsumerContract.ts`

---

## 5. Experience Lifecycle

```
Idle → Welcome → Language → Browse → Category → Product → Modifiers
  → Cart → Review → Checkout → Place Order → Confirmation
  → Automatic Reset → Idle
```

Defined in `kioskExperienceLifecycle.ts`.  
`place_order` hands off to the Ordering Platform; order execution is operational.

---

## 6. Session Lifecycle

| Reset trigger | Result |
|---------------|--------|
| Successful order | Full isolation wipe → idle |
| Cancellation | Full isolation wipe → idle |
| Timeout | Full isolation wipe → idle |
| Administrative reset | Full isolation wipe → idle |

Isolation rules (all required): clear cart, clear customer drafts, clear language override, clear navigation stack, discard unsaved modifiers, return to idle.

Defined in `kioskSessionLifecycle.ts`.

---

## 7. Form Factor & Interaction

Supported presentation form factors: portrait/landscape kiosk, counter touch, table display, large interactive display, tablet.

| Layer | Owns |
|-------|------|
| Experience | Resolution, aspect ratio, orientation, device model, touch hardware |
| Runtime | **None of the above** |

Primary input: **touch**. Compatibility: mouse, keyboard, accessibility devices.  
Shared constants: `ORDERING_KIOSK_PRIMARY_INPUT`, `ORDERING_KIOSK_COMPATIBILITY_INPUTS`.

---

## 8. Registry Status

| Registry | Value |
|----------|-------|
| `ORDERING_PLATFORM_ACTIVE_CHANNELS` | `["qr"]` (production consumption) |
| `ORDERING_PLATFORM_ESTABLISHED_CHANNELS` | `["qr", "kiosk"]` |
| `ORDERING_PLATFORM_FUTURE_CHANNELS` | `["mobile", "waiter_tablet"]` |

---

## 9. Out of Scope

Kiosk UI, payments, loyalty, coupons, reservations, operational runtime changes, database changes, API redesign, QR redesign.

---

This document is binding for SELF-ORDERING-KIOSK-ARCHITECTURE-1.

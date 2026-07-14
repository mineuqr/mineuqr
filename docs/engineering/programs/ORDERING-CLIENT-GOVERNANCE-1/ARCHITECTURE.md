# ORDERING-CLIENT-GOVERNANCE-1 — Architecture

**Status:** Implemented  
**Depends on:** ADR-ARCH-018, RUNTIME-1, CART-1, BROWSE-1, CHECKOUT-1  
**Date:** 2026-07-14  
**Type:** Architecture Governance and Hardening

---

## 1. Governance audit (Phase 1)

### 1.1 Live Ordering Channels

| Channel | Client surface | Status |
|---------|----------------|--------|
| QR | `TableOrderingShell`, `MenuView`, `CheckoutPage`, hosts | Live |
| Kiosk | Contracts only (`kiosk*.ts`) | No UI |
| Waiter Tablet | Channel id only | No UI |
| Mobile | Channel id only | No UI |

### 1.2 Ownership compliance report

| Concern | Required owner | QR compliance |
|---------|----------------|---------------|
| `getRuntimeBySlug` / runtime consumption | Client Platform `useOrderingRuntime` | **Pass** — sole consumer |
| Cart lifecycle | `OrderingCartProvider` | **Pass** |
| Browse lifecycle | `OrderingBrowseProvider` | **Pass** |
| Checkout lifecycle | `OrderingCheckoutProvider` | **Pass** |
| In-experience navigation | `OrderingNavigator` + Client Platform | **Pass** (full stage surface) |
| Notes validation rules | Ordering Platform contracts | **Pass** — checkout helpers only |
| Dining session / post-submission / tracking storage | QR shell | **Pass** (channel-owned) |
| Direct `@shared/ordering-platform` in channel pages | Forbidden | **Pass** — none |
| Channel-owned orchestration in pages | Forbidden | **Pass** |

### 1.3 Soft notes (non-blocking)

| Item | Notes |
|------|-------|
| `useQrOrderingRuntime` | Deprecated façade; pages must not add call sites |
| `CartDrawer` checkout fallback path | Uses navigator when hosted; hard-coded fallback retained for safety (no UX change) |
| `offerCart.ts` | Shared identity helper — not channel orchestration |

**Boundary violations requiring stop/expand:** none.

---

## 2. Dependency graph (normative)

```
Channel Shell (QR / future Kiosk / Waiter)
      │  adapters: CartScopeAdapter, OrderingNavigator
      │  hosts: QrOrderingClientHost / QrBrowseOnlyHost / (future)
      ▼
Ordering Client Platform  (lib/ordering-client)
  · runtime / browse / cart / checkout / governance
      │  consumes delivery query only here
      ▼
Ordering Runtime delivery  (ordering.getRuntimeBySlug → OrderingRuntimeContext)
      ▼
Ordering Platform (+ @shared/ordering-platform contracts)
```

**Forbidden edges**

- Channel page → `useOrderingRuntime` / `getRuntimeBySlug`
- Channel page → `@shared/ordering-platform` business modules
- Channel → peer channel experience modules
- Client Platform → construct/mutate `OrderingRuntimeContext`
- Client Platform → PlaceOrderService / Domain services directly

---

## 3. Contract hardening (Phase 3)

### 3.1 CartScopeAdapter

| Field | QR | Kiosk | Waiter |
|-------|----|-------|--------|
| `slug` | ✓ | ✓ | ✓ |
| `tableNumber` | ✓ | — | optional |
| `sessionId` | optional | — | optional |
| `deviceSessionId` | — | ✓ | — |
| `stationId` | — | — | ✓ |
| `extraKeySegments` | optional | optional | optional |

Factories:

- `createQrTableCartScopeAdapter` (existing; legacy key unchanged)
- `createKioskDeviceCartScopeAdapter` (extension point)
- `createWaiterStationCartScopeAdapter` (extension point)

All keys via `buildCartPersistenceKey`.

### 3.2 OrderingNavigator

Required methods for every channel:

`goToBrowse` · `goToCart` · `goToCheckout` · `goToConfirmation` · `goToTracking`

QR: `goToCart` aliases browse (overlay cart); `goToConfirmation` → confirmed route.

---

## 4. Channel vs Client Platform responsibilities

**Channels:** entry, bootstrap, deep links, route host, form-factor chrome, idle/language/auth, table/session resolution, QR dining/post-submission/tracking side effects, adapter factories.

**Client Platform:** runtime consumption, gates, cart/browse/checkout lifecycles, notes entry presentation, submission orchestration, in-experience navigation state, loading/error presentation for ordering stages.

---

## 5. Out of scope

Kiosk UI · Waiter UI · QR redesign · Ordering Platform/Domain · Database · Kitchen · Expo · Printing

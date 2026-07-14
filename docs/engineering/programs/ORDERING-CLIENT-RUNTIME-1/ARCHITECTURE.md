# ORDERING-CLIENT-RUNTIME-1 — Architecture

**Status:** Implemented (runtime foundation)  
**Depends on:** ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1, ADR-ARCH-018  
**Date:** 2026-07-14

---

## 1. Runtime architecture summary

```
Channel Shell (QR TableOrderingShell)
      │
      ▼
QrOrderingClientHost
  · CartScopeAdapter (QR table)
  · OrderingNavigator (QR routes)
  · OrderingClientErrorBoundary
      │
      ▼
OrderingClientProvider
  · useOrderingRuntime → ordering.getRuntimeBySlug
  · gates via deriveOrderingRuntimeGates
  · presentation context (status, catalogs, adapters)
      │
      ▼
CartProvider + MenuView / CheckoutPage
      │
      ▼
OrderingRuntimeContext → Ordering Platform
```

Browse-only `/menu/:slug` is still QR channel; it uses `useQrOrderingRuntime` → standalone `useOrderingRuntime` (same Client Platform module; no parallel delivery).

---

## 2. Runtime ownership

| Concern | Owner |
|---------|--------|
| `ordering.getRuntimeBySlug` call | `lib/ordering-client/runtime/useOrderingRuntime.ts` **only** |
| Gate derivation | `deriveOrderingRuntimeGates` (shared) |
| Client context | `OrderingClientProvider` |
| CartScopeAdapter / OrderingNavigator contracts | `lib/ordering-client/contracts/*` |
| QR adapters + host | `lib/ordering-client/qr/*` |
| QR shell (slug/table from URL) | `TableOrderingShell` |
| Dining session / tracking pages | QR channel (unchanged) |

---

## 3. Composition contracts

### CartScopeAdapter
- `resolveScopeKey()` — opaque persistence key  
- `description` — channel metadata (`slug`, optional `tableNumber`)  
- QR: `createQrTableCartScopeAdapter`

### OrderingNavigator
- Stages: browse | cart | checkout | confirmation | tracking  
- `goToBrowse` / `goToCheckout` / `goToTracking`  
- QR: `createQrOrderingNavigator`

Future Kiosk/Waiter implement adapters — do not modify Core Platform.

---

## 4. QR shell responsibilities

- Route → slug / tableNumber  
- Host Client Platform via `QrOrderingClientHost`  
- Channel lifecycle (session recovery, post-submission, tracking pages) remains outside host  

Does **not** call `getRuntimeBySlug` directly.

---

## 5. Out of scope (deferred)

Browse refactor · Checkout redesign · Shared component extraction · Kiosk/Waiter UI · Domain/Read Model/Operational

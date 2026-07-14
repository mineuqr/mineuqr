# ORDERING-CLIENT-CART-1 — Architecture

**Status:** Implemented  
**Depends on:** ORDERING-CLIENT-RUNTIME-1, ADR-ARCH-018  
**Date:** 2026-07-14

---

## 1. Architecture audit (pre-change)

| Symbol | Owned | Coupling |
|--------|-------|----------|
| `contexts/CartContext.tsx` | Lifecycle, hydrate, persist, totals | QR `{slug,tableNumber}` |
| `lib/cartStorage.ts` | Key format + sessionStorage | QR table keys |
| `QrOrderingClientHost` | Instantiated CartProvider with slug/table | Dual ownership |
| `createQrTableCartScopeAdapter` | Called `cartStorageKey` | Channel built key |

**Gap:** Cart orchestration lived outside / parallel to Client Platform; channels assembled persistence keys.

---

## 2. Target ownership map

| Concern | Owner |
|---------|--------|
| Cart lifecycle / hydrate / persist / reset | `OrderingCartProvider` |
| Persistence key format + I/O | `cart/cartPersistence.ts` |
| Cart item model | `cart/cartTypes.ts` |
| CartScopeAdapter (identity + namespace) | Channel factory (`createQrTableCartScopeAdapter`) |
| QR host | Provides adapter only; mounts platform cart |
| `contexts/CartContext` | Thin re-export façade |

---

## 3. Composition

```
QrOrderingClientHost
  · createQrTableCartScopeAdapter(slug, table)
  · OrderingNavigator
      │
      ▼
OrderingClientProvider (runtime)
      │
      ▼
OrderingCartProvider(scope)   ← Client Platform orchestrator
      │
      ▼
MenuView / Checkout / CartDrawer / AddToCartButton
```

---

## 4. Persistence

- Namespace: `mineuqr:cart` (platform constant)
- QR table key: `mineuqr:cart:{slug}:{tableNumber}` (**unchanged** — existing carts restore)
- APIs: `loadCartByScopeKey` / `saveCartByScopeKey` / `clearCartByScopeKey`
- Channels never call `sessionStorage` for carts

---

## 5. Boundaries

**In scope:** Cart ownership consolidation  
**Out of scope:** Browse/Checkout UI redesign, Kiosk/Waiter UI, Domain/Runtime/Operational

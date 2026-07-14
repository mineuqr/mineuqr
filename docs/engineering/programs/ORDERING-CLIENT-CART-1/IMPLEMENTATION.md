# ORDERING-CLIENT-CART-1 — Implementation

## 1. Summary

Cart orchestration consolidated into Ordering Client Platform. QR supplies `CartScopeAdapter` only. Legacy QR sessionStorage keys unchanged for backward-compatible cart restoration.

## 2. Files changed

| File | Change |
|------|--------|
| `client/src/lib/ordering-client/cart/*` | **New** types, persistence, `OrderingCartProvider` |
| `client/src/lib/ordering-client/contracts/CartScopeAdapter.ts` | Namespace + identity fields |
| `client/src/lib/ordering-client/qr/*` | Adapter uses platform key builder; host mounts platform cart |
| `client/src/contexts/CartContext.tsx` | Façade re-export |
| `client/src/lib/cartStorage.ts` | Deprecated wrappers → platform persistence |
| Tests + docs | Coverage + certification |

## 3. Cart lifecycle

1. Channel builds `CartScopeAdapter`  
2. `OrderingCartProvider` hydrates via `loadCartByScopeKey(scope.resolveScopeKey())`  
3. Mutations persist on change  
4. Scope key change re-hydrates (multi-table / multi-restaurant)  
5. `clearCart` resets memory + storage  

## 4. QR migration

| Before | After |
|--------|-------|
| Host passed `{slug,tableNumber}` into CartProvider | Host passes `CartScopeAdapter` into `OrderingCartProvider` |
| Persistence keyed inside CartContext | Persistence owned by Client Platform |
| Key helper in `cartStorage` | `buildCartPersistenceKey` |

## 5. Validation

| Check | Result |
|-------|--------|
| ordering-client cart + runtime tests | **16/16 Pass** |
| `npm run build` | **Pass** |

## 6. Certification

**CERTIFIED** — ORDERING-CLIENT-CART-1.

Ordering Client Platform is the sole cart orchestrator. QR provides `CartScopeAdapter` only. Existing `mineuqr:cart:{slug}:{table}` keys remain valid for restored sessions.

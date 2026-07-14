# ORDERING-CLIENT-RUNTIME-1 — Implementation

## 1. Summary

Executable Ordering Client Platform runtime foundation. Shared runtime consumption, client context, `CartScopeAdapter` / `OrderingNavigator` contracts, and QR table adoption via `QrOrderingClientHost`. No UX redesign.

## 2. Files changed

| File | Role |
|------|------|
| `client/src/lib/ordering-client/**` | **New** Client Platform runtime, contracts, QR host |
| `client/src/hooks/useQrOrderingRuntime.ts` | Thin wrapper (host context or shared hook) |
| `client/src/lib/ordering-platform/qrOrderingRuntimeConsumer.ts` | Delegates gates to platform |
| `client/src/lib/ordering-platform/kioskRuntimeConsumerContract.ts` | Delegates gates to platform |
| `client/src/pages/TableOrderingShell.tsx` | QR shell → `QrOrderingClientHost` |
| `client/src/components/CartDrawer.tsx` | Prefer platform navigator |
| `client/src/pages/CheckoutPage.tsx` | Prefer platform navigator |
| `client/src/pages/MenuView.tsx` | Comment / consumption path |
| Guards + tests + docs | Validation |

## 3. QR migration

| Before | After |
|--------|-------|
| Shell owned `CartProvider` only | Shell hosts Client Platform + cart |
| Hook called `getRuntimeBySlug` | Only `useOrderingRuntime` calls delivery API |
| Duplicate QR/Kiosk gate maps | Single `deriveOrderingRuntimeGates` |

User-visible paths and cart sessionStorage keys unchanged.

## 4. Validation

| Check | Result |
|-------|--------|
| Client runtime + architecture tests | **25/25 Pass** |
| `npm run build` | **Pass** |

## 5. Certification

**CERTIFIED** — ORDERING-CLIENT-RUNTIME-1.

Ordering Client Platform is the runtime entry for ordering channels. QR table experience is hosted by `QrOrderingClientHost` with unchanged user-visible behaviour. Follow-ons: ORDERING-CLIENT-CART-1, BROWSE-1, CHECKOUT-1.
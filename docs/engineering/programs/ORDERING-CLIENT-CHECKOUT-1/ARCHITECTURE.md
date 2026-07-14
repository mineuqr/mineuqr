# ORDERING-CLIENT-CHECKOUT-1 — Architecture

**Status:** Implemented  
**Depends on:** ORDERING-CLIENT-RUNTIME-1, ORDERING-CLIENT-CART-1, ORDERING-CLIENT-BROWSE-1, ADR-ARCH-018  
**Date:** 2026-07-14

---

## 1. Architecture audit (pre-change)

| Symbol | Owned | Coupling |
|--------|-------|----------|
| `pages/CheckoutPage.tsx` | Form state, notes validation call, `order.create`, submit pending/error, summary UI, success side-effects wiring | QR routes, dining session, post-submission, tracking storage |
| `useQrOrderingRuntime` | Gates / restaurant for eligibility | Already Client Platform |
| `OrderingNavigator` | goToBrowse / goToTracking | Underused on success path (fallback routes) |
| Notes validators | `@shared/ordering-platform/orderingNotesContract` | Correct — platform contracts |
| Cart | Line items + totals for summary | CART-1 |

**Gap:** Checkout orchestration lived in the QR page. Channels would reimplement submission lifecycle, notes presentation gating, and error mapping.

---

## 2. Target ownership map

| Concern | Owner |
|---------|--------|
| Checkout form state (name, phone, order notes) | `OrderingCheckoutProvider` |
| Submission lifecycle (idle/pending/success/failure) | `OrderingCheckoutProvider` |
| Notes validation presentation (via shared contracts) | `checkout/checkoutSubmission.ts` |
| Order summary projection from cart | Client Platform checkout |
| `order.create` mutation orchestration | `OrderingCheckoutProvider` |
| Error / success mapping | `checkoutSubmission` + provider |
| Post-submit navigation | `OrderingNavigator` |
| Runtime gates / capabilities | Ordering Runtime via Client Platform |
| Table/session resolution, dining recovery, post-submission lock | QR channel shell |
| Tracking storage / confirmation snapshot / journey marks | QR channel (tracking owner) |
| Cart / Browse / Ordering Platform / Domain | Out of scope |

---

## 3. Composition

```
Channel Shell (QR TableOrderingShell)
  · route → slug / table / checkout stage
      │
      ▼
QrOrderingClientHost
  · CartScopeAdapter + OrderingNavigator
      │
      ▼
OrderingClientProvider (runtime)
  → OrderingBrowseProvider
    → OrderingCartProvider
      → OrderingCheckoutProvider   ← Client Platform checkout orchestrator
            │
            ▼
      CheckoutPage (QR shell UI + channel lifecycle)
```

---

## 4. Submission lifecycle

```
idle → pending → success → (navigator.goToTracking)
              ↘ failure → idle (retry via resubmit)
```

1. Channel supplies table/session + `channelAllowsSubmit`  
2. Platform validates notes via Ordering Platform contracts (not channel rules)  
3. Platform calls `order.create` (existing client entry — not PlaceOrderService)  
4. Channel `onSuccess` runs tracking/session persistence  
5. Platform clears cart + navigates via `OrderingNavigator`  

---

## 5. Boundaries

**In scope:** Checkout ownership consolidation into Ordering Client Platform  
**Out of scope:** Ordering Platform/Domain/Runtime, Cart, Browse, Database, Kitchen, Expo, Printing, Kiosk/Waiter UI

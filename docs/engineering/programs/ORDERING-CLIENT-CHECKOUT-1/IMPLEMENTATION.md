# ORDERING-CLIENT-CHECKOUT-1 — Implementation
## Phase C — Certification Report

**Program:** ORDERING-CLIENT-CHECKOUT-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Checkout orchestration consolidated into the Ordering Client Platform. QR `CheckoutPage` is a channel shell (route bootstrap, dining session, post-submission, tracking side effects). Form state, order summary projection, notes validation presentation (via Ordering Platform contracts), submission lifecycle, error mapping, cart clear, and post-submit navigation via `OrderingNavigator` live in `OrderingCheckoutProvider`. No PlaceOrderService calls; no duplicated validation/business rules.

---

## 2. Architecture audit

See `ARCHITECTURE.md` §1–2.

---

## 3. Checkout ownership map

| Concern | Owner |
|---------|--------|
| Form / submission / summary / notes validation presentation | `OrderingCheckoutProvider` |
| `order.create` orchestration | Client Platform checkout |
| Notes contracts | `@shared/ordering-platform/orderingNotesContract` |
| Runtime gates | Ordering Runtime via Client Platform |
| Dining session / post-submission / tracking persistence | QR shell |
| Cart / Browse / Domain / Platform services | Unchanged / out of scope |

---

## 4. Files changed

| File | Change |
|------|--------|
| `client/src/lib/ordering-client/checkout/*` | **New** types, pure helpers, provider |
| `client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx` | Mounts `OrderingCheckoutProvider` |
| `client/src/lib/ordering-client/index.ts` | Checkout exports |
| `client/src/pages/CheckoutPage.tsx` | Thin QR shell |
| Tests + ADR/docs | Guards, unit tests, certification |

**Not modified:** Ordering Platform, Domain, Runtime delivery, Cart, Browse, Database, Kitchen, Expo, Printing, Kiosk/Waiter UI.

---

## 5. Checkout lifecycle summary

1. Channel hosts Client Platform (`QrOrderingClientHost`)  
2. Shell supplies table/session + `channelAllowsSubmit`  
3. Provider validates notes via platform contracts  
4. Provider calls `order.create`  
5. Channel `onSuccess` persists tracking/session artifacts  
6. Provider clears cart + `navigator.goToTracking`  
7. Failure → mapped error → shell toast → retry via resubmit  

---

## 6. QR migration summary

| Before | After |
|--------|-------|
| Page owned form + submit + validation | `OrderingCheckoutProvider` |
| Page called `order.create` | Provider orchestrates mutation |
| Mixed navigator / hard-coded tracking path | `OrderingNavigator.goToTracking` |
| Page used `useQrOrderingRuntime` | `useOrderingClientRuntime` (hosted) |

**Unchanged UX:** summary, optional fields, submit CTA, session banners, post-submission lock, tracking handoff, dining session storage.

---

## 7. Test summary

| Suite | Tests | Result |
|-------|-------|--------|
| `orderingClientCheckout.test.ts` | 6 | Pass |
| `orderingClientCheckout.architecture.guards.test.ts` | 5 | Pass |
| QR migration + prior Client Platform guards | Pass | Pass |

**Coverage:** summary lines, notes validation (order/item), error mapping, ownership (no page `useState` / `order.create` / validators), host mounts provider.

---

## 8. Build result

```
npm run build — SUCCESS
```

---

## 9. Documentation summary

| Doc | Update |
|-----|--------|
| `ORDERING-CLIENT-CHECKOUT-1/ARCHITECTURE.md` | Ownership + composition |
| `ORDERING-CLIENT-CHECKOUT-1/IMPLEMENTATION.md` | This report |
| ADR-ARCH-018 | CHECKOUT-1 acceptance |
| ADR Registry | Implementation status |

---

## 10. Certification report

| Criterion | Status |
|-----------|--------|
| Checkout ownership in Client Platform | ✓ |
| Notes entry / summary / submission lifecycle | ✓ |
| Runtime gates only; no PlaceOrderService | ✓ |
| Error + retry presentation | ✓ |
| Navigation via OrderingNavigator | ✓ |
| QR routes / UX preserved | ✓ |
| Out-of-scope surfaces untouched | ✓ |

**ORDERING-CLIENT-CHECKOUT-1 is CERTIFIED.**

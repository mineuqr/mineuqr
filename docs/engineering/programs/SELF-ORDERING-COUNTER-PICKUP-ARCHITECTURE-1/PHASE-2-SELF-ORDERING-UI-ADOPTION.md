# SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 — Phase 2 Architecture Adoption Report

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 |
| **Phase** | Phase 2 — Self Ordering UI Adoption |
| **Date** | 2026-07-24 |
| **Prerequisite** | Phase 1 Architecture Audit — CERTIFIED |
| **Scope** | Self Ordering (kiosk) UI only |
| **Verdict** | **PHASE 2 CERTIFIED** |

---

## Executive Summary

Customer settlement UI has been removed from Self Ordering. The kiosk journey is now:

```
Browse → Cart → Review → Place Order (placeWithIdentity)
  → OrderCreated (+ ensureCheckForOrder)
  → Kitchen starts immediately
  → Confirmation (pickup identity)
  → Customer goes to cashier
```

Backend Settlement Platform (`order.settlePaid`, `SettleOrderPaidService`, Settlement Record) is **unchanged and retained** for cashier adoption (Phase 4+).

---

## Architecture Adoption Impact

| Concern | Impact |
|---------|--------|
| Kitchen / KDS / Print / Expo | **None** — still driven by `OrderCreated` at place |
| Order Aggregate | **None** — still `placeWithIdentity` |
| Check Aggregate | **None** — still `ensureCheckForOrder` at place |
| Settlement Platform | **None** — server APIs preserved; customer UI no longer calls them |
| Reporting | **None** — still Paid Settlement Records only |
| Cashier / Dashboard | **None** — out of Phase 2 scope |

No unexpected architectural dependency discovered. No Architecture Impact STOP required.

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/pages/kiosk/KioskCheckoutStage.tsx` | Removed payment/success steps; place → provider default confirmation path |
| `client/src/pages/kiosk/KioskConfirmationStage.tsx` | Operational confirmation copy (received + pickup number + cashier guidance) |
| `client/src/lib/ordering-client/checkout/checkoutTypes.ts` | Comment: kiosk must not defer post-place navigation |
| `client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx` | Comment clarify cart clear on place (logic unchanged) |
| `client/src/lib/ordering-client/__tests__/selfOrderingSettlementAdoption.architecture.guards.test.ts` | Guards: backend settle kept; kiosk UI must not invoke settle |
| `client/src/lib/ordering-client/__tests__/selfOrderingCounterPickup.architecture.guards.test.ts` | **New** Phase 2 architecture guards |

**Not modified (intentional):** `SettleOrderPaidService`, `server/routers.ts` settle procedures, Kitchen, Settlement Record UI, Dashboard, Cashier.

---

## Dependency Changes

### Removed from customer UI reachability

| Former dependency | Status |
|-------------------|--------|
| Checkout step `payment` | Removed |
| Checkout step `success` | Removed |
| `trpc.order.settlePaid` (kiosk) | Removed from UI |
| `trpc.order.getSettlementReceipt` (kiosk) | Removed from UI |
| `settlementRecordUiLabel` / payment method grid | Removed from kiosk |
| `deferTrackingNavigation: true` on kiosk submit | Removed (cart no longer waits for settle) |
| Customer Settlement Receipt modal | Removed |

### Preserved (server / kitchen)

| Dependency | Status |
|------------|--------|
| `order.placeWithIdentity` | Unchanged |
| `ensureCheckForOrder` | Unchanged |
| `OrderCreated` → kitchen / print / projections | Unchanged |
| `order.settlePaid` / `getSettlementReceipt` procedures | Unchanged (cashier reuse) |
| Confirmation `displayReference` handoff | Unchanged |

---

## Settlement → Confirmation Refactors

Every location that assumed **Settlement Completed → Confirmation**:

| Location | Before | After |
|----------|--------|-------|
| `KioskCheckoutStage.tsx` | Place → `deferTrackingNavigation` → Register Payment → Success → `goToTracking` | Place via `checkout.submit` (no defer) → provider navigates |
| `OrderingCheckoutProvider.tsx` | Cart cleared only when not deferred | Same default path now used by kiosk — clear cart + `goToTracking` on place success |
| Cart cleanup gated on settle success | `cart.clearCart()` inside `handleRegisterPayment` | Cart cleared in provider on place success |

No other client files invoked kiosk settle → confirmation.

---

## Cart Lifecycle

On successful `placeWithIdentity` (default submit path):

1. `cart.clearCart()`
2. Checkout form `resetForm()`
3. `navigator.goToTracking(token)` → kiosk confirmation stage

Payment-local state (amount paid, selected method, settle result) no longer exists in kiosk checkout.

---

## Confirmation Screen (operational only)

Displays:

- “Your Order Has Been Received” / تم استلام طلبك  
- Pickup Number + `displayReference`  
- Proceed to cashier guidance  
- Auto-return / New order  

Does **not** display: Payment Successful, Settlement Complete, financial receipt, payment method, Paid status.

---

## Regression Analysis

| Check | Evidence | Status |
|-------|----------|--------|
| Order creation still works | Same `checkout.submit` → `placeWithIdentity` | Pass (architecture) |
| Check creation still works | Place path unchanged (`ensureCheckForOrder`) | Pass (architecture) |
| Kitchen on `OrderCreated` | No kitchen/place server changes | Pass (architecture) |
| Kitchen printing / Display / Expo | Untouched | Pass (architecture) |
| Confirmation + pickup identity | `KioskConfirmationStage` + `displayReference` | Pass |
| Cart resets on place | Provider `!deferTrackingNavigation` path | Pass |
| No customer settle APIs in kiosk UI | Guards assert absence | Pass |
| Settlement backend retained | Guards assert `settlePaid` / service present | Pass |

### Guard test run (2026-07-24)

```
✓ selfOrderingSettlementAdoption.architecture.guards.test.ts (4)
✓ selfOrderingCounterPickup.architecture.guards.test.ts (3)
✓ orderConfirmationPresentation.architecture.guards.test.ts (4)
✓ kioskIdentityAdoption.architecture.guards.test.ts (6)
✓ orderingClientKiosk.architecture.guards.test.ts (7)
→ 24 passed
```

---

## Certification Report

| Criterion | Status |
|-----------|--------|
| Customer never selects payment | **Met** |
| Customer journey ends at Confirmation | **Met** |
| Customer never invokes Settlement | **Met** |
| Place Order / Check / Kitchen path preserved | **Met** |
| Settlement Platform not removed | **Met** |
| No Kitchen / Settlement / Reporting / Cashier edits | **Met** |
| No duplicate settlement logic | **Met** |
| Architecture guards updated | **Met** |

### Phase 2 Verdict

**PHASE 2 SELF ORDERING UI ADOPTION CERTIFIED**

Do **not** start Phase 3 validation gates or Phase 4 Cashier adoption without explicit authorization.

---

## Deferred (later phases)

- Phase 3 — Runtime / operational validation certification  
- Phase 4 — Cashier Cancel + Settle (sessionless Check — IMPACT-1)  
- Phase 5 — Present Order = Served  
- Phase 6–7 — Settlement / Reporting adoption confirmation  

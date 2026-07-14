# ORDER-CONFIRMATION-PRESENTATION-ADOPTION-1 — Implementation
## Engineering / Certification Report

**Program:** ORDER-CONFIRMATION-PRESENTATION-ADOPTION-1 (Revision B)  
**Type:** Presentation Adoption (Minimal API Exposure)  
**Date:** 2026-07-15  
**Decision:** **CERTIFIED**

---

## 1. Confirmation Identity Forensics

### Root cause

BI assignment was written on `orders` at place time but not returned on place/public confirmation payloads. Kiosk rendered raw `trackingToken`; QR rendered legacy `orderNumber`.

### Evidence

- Allocator return discarded in `DrizzleOrderRepository.insertTransactional` (pre-fix).
- `PlaceOrderResult` lacked `displayReference`.
- `getOrderByTrackingToken` did not select BI columns.
- `KioskConfirmationStage` labeled token as “Tracking:” / “رمز التتبع:”.

### API boundary analysis

Gap was **exposure only**. Allocation and resolution already existed; confirmation APIs did not surface the resolved string.

---

## 2. API Exposure Changes

| Endpoint | Change |
|----------|--------|
| `order.create` | Returns `displayReference` |
| `order.placeWithIdentity` | Returns `displayReference` |
| `order.getPublicStatus` | Returns `displayReference` (resolved from BI columns) |

`SaveOrderResult.businessIdentity` carries allocator output; `PlaceOrderService` resolves via `resolveOrderDisplayIdentity`. Public status uses the same resolver.

Ownership: Business Identity infrastructure unchanged.

---

## 3. Presentation Adoption Summary

| Surface | Behavior |
|---------|----------|
| Kiosk confirmation | Shows `displayReference`; token hidden |
| QR OrderStatusPage / OrderReceivedHero | Shows `displayReference` |
| Checkout handoff | `saveConfirmationDisplayIdentity` + snapshot field |

No UI assembly of `T` / `K` / `#`.

---

## 4. Files Modified

| Area | Files |
|------|--------|
| Place path | `OrderRepository.ts`, `DrizzleOrderRepository.ts`, `PlaceOrderService.ts`, `routers.ts` |
| Public status | `db.ts`, `orderPublicStatus.ts`, `order-get-public-status.test.ts` |
| Client handoff | `checkoutTypes.ts`, `OrderingCheckoutProvider.tsx`, `orderConfirmationStorage.ts`, `CheckoutPage.tsx` |
| Confirmation UI | `KioskConfirmationStage.tsx`, `KioskShell.tsx`, `OrderStatusPage.tsx`, `OrderReceivedHero.tsx` |
| Guards / docs | architecture guards + program ARCHITECTURE/IMPLEMENTATION |

---

## 5. Regression Analysis

| Area | Result |
|------|--------|
| BI allocation | Unchanged |
| Runtime / Projection | Unchanged |
| Tracking APIs | Token still used for lookup |
| Place order | Additive `displayReference` field |
| Legacy `orderNumber` | Still returned; not customer hero identity when BI present |

---

## 6. Acceptance Validation

| Criterion | Status |
|-----------|--------|
| Customers see `T #001` / `K #001` | **PASS** (server-resolved) |
| No tracking token in UI | **PASS** |
| No UUID / internal id in confirmation UI | **PASS** |
| Shared resolver ownership | **PASS** |
| Place / lookup / public status | **PASS** |

---

## 7. Test / Build Gate

| Gate | Result |
|------|--------|
| Public status + place + confirmation guards | **16/16 PASS** |
| `vite build` | **PASS** |

---

## 8. Certification

**CERTIFIED** — Order Confirmation displays server-owned Business Display Identity without parallel identity generation or architectural ownership violations.

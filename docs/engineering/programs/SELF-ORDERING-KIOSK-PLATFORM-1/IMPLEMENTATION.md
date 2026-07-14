# SELF-ORDERING-KIOSK-PLATFORM-1 — Implementation
## Certification Report

**Program:** SELF-ORDERING-KIOSK-PLATFORM-1  
**Type:** Architecture Implementation (Ordering Channel)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Self Ordering Kiosk is implemented as a pure Ordering Channel composing the certified Ordering Client Platform. The kiosk owns idle, language, session isolation, and auto-reset only. Browse, cart, checkout, and submission remain Client Platform–owned. QR and Ordering Platform are untouched.

---

## 2. Architecture audit / ownership

See `ARCHITECTURE.md` §1–2.

---

## 3. Composition

See `ARCHITECTURE.md` §3.

---

## 4. Files changed

| File | Change |
|------|--------|
| `client/src/lib/ordering-client/kiosk/*` | **New** host, adapters, session helpers |
| `client/src/pages/kiosk/*` | **New** shell + stage chrome |
| `client/src/App.tsx` | Mount `/kiosk/:slug/*` routes |
| `ordering-client/index.ts` | Kiosk exports |
| `CartScopeAdapter` | Additive `restaurantId` / `kioskId` |
| `kioskOrderingChannelContract.ts` | Routes documented as mounted |
| Architecture guards + docs | PLATFORM-1 certification |

---

## 5. Flow verification

| Step | Result |
|------|--------|
| Idle → touch → language → menu | Shell |
| Browse/cart/checkout | Client Platform providers |
| Place order | `OrderingCheckoutProvider` → `order.create` |
| Confirmation → auto reset → idle | Shell (new `deviceSessionId`, language reset, cart clear) |
| Idle timeout | Shell resets active sessions |
| QR routes | Unchanged |

**Notes:**
- Place order requires channel binding `?table=` (existing table API).
- Ordering Platform registry left unchanged (`ACTIVE_CHANNELS` remains QR-only; kiosk stays **established**).
- Entry: `/kiosk/:slug?station=&table=&kiosk=`

---

## 6. Test summary

| Suite | Tests | Result |
|-------|-------|--------|
| `orderingClientKiosk.architecture.guards.test.ts` | 6 | Pass |
| `kioskOrderingArchitecture.architecture.guards.test.ts` (client) | 5 | Pass |
| Governance guards (spot) | 7 | Pass |

---

## 7. Build result

```
npm run build — SUCCESS
```

---

## 8. Documentation summary

| Doc | Content |
|-----|---------|
| `ARCHITECTURE.md` | Ownership, composition, adapters |
| `IMPLEMENTATION.md` | This report |

---

## 9. Certification report

| Criterion | Status |
|-----------|--------|
| Kiosk is pure channel over Client Platform | ✓ |
| No duplicated browse/cart/checkout/runtime ownership | ✓ |
| Auto reset + session isolation | ✓ |
| QR unaffected | ✓ |
| Ordering Platform ownership untouched (no business/API changes) | ✓ |

**Architectural note (reported, not expanded):** Kiosk place-order still binds to an existing table via `?table=` because PlaceOrder requires `tableId`. A dedicated kiosk/counter place-order contract would need a separate Architecture Program.

**SELF-ORDERING-KIOSK-PLATFORM-1 is CERTIFIED.**

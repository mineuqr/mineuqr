# KIOSK-IDENTITY-ADOPTION-1 — Implementation
## Certification Report

**Program:** KIOSK-IDENTITY-ADOPTION-1  
**Type:** Architecture Implementation (Channel Adoption)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Self Ordering Kiosk places orders via station Fulfilment Anchor (`counter` + `station`) through channel-agnostic `order.placeWithIdentity` → `IdentityPlaceOrderService`. `?table=` is no longer required. No fake tables. Platform remains channel-agnostic. QR table path unchanged.

---

## 2–6. Summaries

See `ARCHITECTURE.md` for audit, adoption model, ownership, session integration, and QR verification.

---

## 7. Files changed

| File | Change |
|------|--------|
| `server/routers.ts` | `order.placeWithIdentity` + shared restaurant gate |
| `client/.../checkout/checkoutTypes.ts` | Table vs identity submit union |
| `client/.../checkout/OrderingCheckoutProvider.tsx` | Dual submit paths (create / placeWithIdentity) |
| `client/.../kiosk/kioskStationIdentity.ts` | **New** station→identity adapter |
| `client/.../pages/kiosk/KioskCheckoutStage.tsx` | Identity submit; no table |
| `client/.../pages/kiosk/KioskShell.tsx` | Drop `?table=` preservation |
| Tests + ADR-019 + program docs | Validation / certification |

---

## 8. Test summary

| Suite | Result |
|-------|--------|
| Kiosk identity adoption guards | Pass |
| Kiosk / checkout Client Platform guards | Pass |
| IdentityPlaceOrder + session resolve | Pass |
| QR session dual-write regression | Pass |

---

## 9. Build result

`npm run build` — **PASS**.

---

## 10. Documentation summary

| Doc | Content |
|-----|---------|
| `ARCHITECTURE.md` | Audit, ownership, session |
| `IMPLEMENTATION.md` | This report |
| ADR-ARCH-019 | Kiosk adoption progress |

---

## 11. Certification report

| Criterion | Status |
|-----------|--------|
| Station Fulfilment Anchor | ✓ |
| IdentityPlaceOrder (no table-only kiosk path) | ✓ |
| Operational Session station ephemeral | ✓ |
| No platform kiosk branching | ✓ |
| Shell owns idle/reset only | ✓ |
| QR unaffected | ✓ |

**KIOSK-IDENTITY-ADOPTION-1 is CERTIFIED.**

# NON-TABLE-PLACE-ORDER-1 — Implementation
## Certification Report

**Program:** NON-TABLE-PLACE-ORDER-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

PlaceOrder is identity-driven. Table ordering remains one Fulfilment Anchor type via the existing QR path. Non-table anchors (station, pickup_point, queue, drive_lane) are accepted through `IdentityPlaceOrderService` + ephemeral Operational Session resolution, with LEGACY_NON_TABLE dual-write into NOT NULL table columns. No fake tables. No channel UI activation. QR behaviour preserved. Business Identity unchanged.

---

## 2–6. Summaries

See `ARCHITECTURE.md` for audit, ownership, session integration, BI verification, and QR compatibility.

---

## 7. Files changed

| File | Change |
|------|--------|
| `shared/ordering-platform/orderingIdentityContract.ts` | Non-table helpers, sentinels, persist dual-write, platform capabilities |
| `shared/ordering-platform/orderingRuntimeContract.ts` | PlaceOrder command identity-canonical (legacy optional) |
| `shared/operational-session/*` | Activate all anchors; ephemeral result; fulfilment→session map |
| `server/operational-session/ephemeralSessionAdapter.ts` | **New** non-table resolve |
| `server/operational-session/resolveOperationalSession.ts` | Route all anchor types |
| `server/order/application/PlaceOrderService.ts` | Persist fields from identity |
| `server/order/application/IdentityPlaceOrderService.ts` | **New** identity orchestration |
| `server/order/placeOrderComposition.ts` | Export `identityPlaceOrderService` |
| `server/routers.ts` | Null-safe table session (QR unchanged) |
| Tests + ADR-019 + program docs | Validation / certification |

---

## 8. Test summary

| Suite | Result |
|-------|--------|
| Non-table identity + architecture guards | Pass |
| IdentityPlaceOrderService | Pass |
| resolveOperationalSession (table + ephemeral) | Pass |
| QR dual-write / identity regression | Pass |

---

## 9. Build result

`npm run build` — **PASS** (vite client + esbuild server / vercel handler).

---

## 10. Documentation summary

| Doc | Content |
|-----|---------|
| `ARCHITECTURE.md` | Audit, activation, ownership |
| `IMPLEMENTATION.md` | This report |
| ADR-ARCH-019 | Non-table PlaceOrder progress |

---

## 11. Certification report

| Criterion | Status |
|-----------|--------|
| PlaceOrder identity-driven | ✓ |
| Table + non-table same model | ✓ |
| resolveOperationalSession for all anchors | ✓ |
| No fake tables / no channel forks | ✓ |
| QR behavioural compatibility | ✓ |
| Business Identity unchanged | ✓ |
| No channel UI activation | ✓ |

**NON-TABLE-PLACE-ORDER-1 is CERTIFIED.**

Follow-ons: Kiosk/Counter/Pickup UI adoption, nullable table columns migration, OPS fulfilment label.

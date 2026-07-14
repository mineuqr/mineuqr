# ORDER-IDENTITY-RUNTIME-1 — Implementation
## Certification Report

**Program:** ORDER-IDENTITY-RUNTIME-1  
**Type:** Architecture Implementation (Runtime Foundation)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Order Identity runtime foundation landed per ADR-ARCH-019. Shared contracts define Service Mode, Fulfilment Anchor, and Operational Session Identity. Ordering Runtime projects default `table_service` + `table` policies. PlaceOrder assembles table identity and dual-writes legacy table fields into the Order Domain. QR production behaviour is preserved. No schema, Session Platform, BI, or ops UI changes.

---

## 2. Architecture audit / ownership

See `ARCHITECTURE.md` §1–2.

---

## 3. Runtime contract changes

| Contract | Change |
|----------|--------|
| `orderingIdentityContract.ts` | **New** modes, anchors, identity, helpers |
| `OrderingRuntimeContext.orderIdentity` | Policy projection (defaults table-only) |
| `OrderingPlaceOrderCommand.identity` | Canonical identity (+ legacy tableId) |
| `PlaceOrderCommand.identity?` | Optional; resolved before domain place |

---

## 4. Files changed

| File | Change |
|------|--------|
| `shared/ordering-platform/orderingIdentityContract.ts` | **New** |
| `shared/ordering-platform/orderingRuntimeContract.ts` | orderIdentity + PlaceOrder identity |
| `shared/ordering-platform/index.ts` | Exports |
| `server/ordering-platform/OrderingRuntimeMaterializer.ts` | Default policies |
| `server/ordering-platform/OrderingRuntimeContextFactory.ts` | Hydrate orderIdentity |
| `server/order/application/PlaceOrderService.ts` | Consume identity bridge |
| `server/routers.ts` | `createTableOrderIdentity` on create |
| Tests + fixtures | Identity + materializer + guards |
| Docs + ADR-ARCH-019 | Implementation status |

---

## 5. QR compatibility verification

| Check | Result |
|-------|--------|
| `order.create` input unchanged | ✓ |
| Table lookup + persist fields unchanged | ✓ |
| Session dual-write unchanged | ✓ |
| No QR route / UX changes | ✓ |
| Runtime additive `orderIdentity` | ✓ |

---

## 6. Test summary

| Suite | Result |
|-------|--------|
| `orderingIdentityContract.test.ts` | Pass |
| `orderingIdentity.architecture.guards.test.ts` | Pass |
| OrderingRuntimeMaterializer (incl. orderIdentity) | Pass |
| Related client runtime fixtures updated | Pass |

---

## 7. Build result

`npm run build` — **PASS** (vite client + esbuild server / vercel handler).

---

## 8. Documentation summary

| Doc | Content |
|-----|---------|
| `ARCHITECTURE.md` | Audit, ownership, pipeline |
| `IMPLEMENTATION.md` | This report |
| ADR-ARCH-019 | Runtime foundation status |

---

## 9. Certification report

| Criterion | Status |
|-----------|--------|
| Runtime identity contracts exist | ✓ |
| Table is one Fulfilment Anchor type | ✓ |
| PlaceOrder consumes identity | ✓ |
| QR behavioural compatibility | ✓ |
| No schema / session / BI / ops scope creep | ✓ |

**ORDER-IDENTITY-RUNTIME-1 is CERTIFIED.**

Follow-ons (separate programs): non-table PlaceOrder activation, Session Anchor platform, ops fulfilment label, Kiosk identity adoption.

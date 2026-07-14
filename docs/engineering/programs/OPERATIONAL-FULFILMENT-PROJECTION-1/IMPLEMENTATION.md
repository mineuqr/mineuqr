# OPERATIONAL-FULFILMENT-PROJECTION-1 — Implementation
## Certification Report

**Program:** OPERATIONAL-FULFILMENT-PROJECTION-1  
**Type:** Architecture Implementation (Order Read Model)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

Order Domain dual-writes Service Mode, Fulfilment Anchor Type, and Fulfilment Label. Order Read Model projects them into `order_read_orders` and Operational DTOs (`ActiveOrderItemDto`, Kitchen, Print). Ops screens gain projected fields without UI layout changes. Historical rows resolve via deterministic legacy derivation. QR table path preserved.

---

## 2–5. Summaries

See `ARCHITECTURE.md` for audit, ownership, flow, and boundaries.

### Read Model / DTO changes

| Artifact | Change |
|----------|--------|
| `orders` + `order_read_orders` | Additive `serviceMode`, `fulfilmentAnchorType`, `fulfilmentLabel` |
| `ActiveOrderItemDto` | Required projected fulfilment fields |
| `KitchenTicketDto` / `PrintWorkspaceOrderDto` / `PrintPayload` | Pass-through |
| `ORDER_READ_PROJECTION_SCHEMA_VERSION` | 4 → 5 |

---

## 6. Files changed

| Area | Files |
|------|--------|
| Shared | `orderFulfilmentProjection.ts`, exports |
| Migration | `drizzle/0065_order_fulfilment_projection.sql`, `schema.ts` |
| Write | `Order.ts`, `PlaceOrderService.ts`, `DrizzleOrderRepository.ts`, `OrderMapper.ts` |
| Read | materializer store, operational read store, `mapActiveOrderItemDto`, projectionIds |
| Ops DTO | kitchen contracts/composer/adapter, print workspace map/contracts, PrintPayload |
| Docs / ADR | program docs + ADR-019 / registry |

---

## 7. Projection flow summary

Identity → Order stamps → Read materializer → ActiveOrderItemDto → Kitchen/Print DTOs.

---

## 8. Operational compatibility

| Surface | Result |
|---------|--------|
| Kitchen DTO fields present | ✓ |
| Print workspace DTO fields present | ✓ |
| Print payload optional fields | ✓ |
| Orders (`ActiveOrderItemDto`) | ✓ |
| UI layouts unchanged | ✓ |
| QR table dual-compat | ✓ |

---

## 9. Test summary

| Suite | Result |
|-------|--------|
| Fulfilment projection unit + architecture guards | Pass |
| Materializer / Kitchen / Print DTO tests | Pass |
| QR session dual-write regression | Pass |

## 10. Build result

`npm run build` — **PASS**.

---

## 11. Documentation

`ARCHITECTURE.md`, this report, ADR-ARCH-019 progress.

---

## 12. Certification

| Criterion | Status |
|-----------|--------|
| Projection owns fulfilment facts | ✓ |
| Read Model stores projected fields | ✓ |
| Operational DTO exposes them | ✓ |
| No Session/Runtime queries from ops read path | ✓ |
| No ops UI business logic added | ✓ |
| QR compatibility | ✓ |

**OPERATIONAL-FULFILMENT-PROJECTION-1 is CERTIFIED.**

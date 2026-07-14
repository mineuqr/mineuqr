# OPERATIONAL-FULFILMENT-PROJECTION-1 — Architecture

**Status:** Implemented  
**Depends on:** ADR-ARCH-019, ORDER-IDENTITY-RUNTIME-1, OPERATIONAL-SESSION-PLATFORM-1, NON-TABLE-PLACE-ORDER-1, KIOSK-IDENTITY-ADOPTION-1  
**Date:** 2026-07-14  
**Type:** Order Read Model / Operational Projection

---

## 1. Architecture audit

| Finding | Classification |
|---------|----------------|
| Identity lived only at PlaceOrder runtime | Architectural gap |
| `orders` / `order_read_*` stored only `tableId`/`tableNumber`/`sessionId` | Projection incomplete |
| Kitchen / Expo / Print / Orders DTOs exposed `tableNumber` only | Presentation forced to reconstruct |
| `tableNumber <= 0` → takeaway heuristics in UI helpers | Runtime/presentation violation of Projection Before Presentation |

### Root cause

ADR-019 identity was activated on write/runtime but never stamped into Order Domain / Read Model, so ops surfaces kept reconstructing fulfilment from `tableNumber`.

---

## 2. Projection ownership map

| Concern | Owner |
|---------|--------|
| Fulfilment stamp at place time | Order Domain dual-write (`serviceMode`, `fulfilmentAnchorType`, `fulfilmentLabel`) |
| Deterministic derivation helpers | `@shared/ordering-platform/orderFulfilmentProjection` |
| Materialization into `order_read_orders` | Order Read Projection pipeline |
| Operational DTO | `ActiveOrderItemDto` (+ Kitchen / Print pass-through) |
| Presentation layouts | Unchanged (out of scope) |

---

## 3. Fulfilment projection flow

```
OrderingOrderIdentity (PlaceOrder)
        │ dual-write stamp
        ▼
orders.serviceMode / fulfilmentAnchorType / fulfilmentLabel
        │ materialize
        ▼
order_read_orders (same fields)
        │ mapActiveOrderItemDto (+ legacy resolve if null)
        ▼
ActiveOrderItemDto
        │
        ├── KitchenTicketDto
        ├── PrintWorkspaceOrderDto
        └── PrintPayload (optional fields)
```

Historical rows without stamps: `resolveFulfilmentProjection` derives from `tableNumber` (QR-compatible).

---

## 4. Architectural boundaries

**In scope:** Write stamps, read schema, materializer, Operational DTOs, Kitchen/Print DTO pass-through  

**Out of scope:** Ops UI layouts, Ordering Platform redesign, Session Platform, PlaceOrder business rules, QR/Kiosk UX  

**Forbidden:** Ops screens querying Session / Runtime / IdentityPlaceOrder  

---

## 5. Compatibility

- `tableNumber` retained on DTOs for QR dual-compat  
- New fields additive / nullable on DB  
- Projection schema version → **5**  

# OPERATIONAL-FULFILMENT-PRESENTATION-1 — Architecture

**Status:** Implemented  
**Depends on:** ADR-ARCH-019 (Accepted), OPERATIONAL-FULFILMENT-PROJECTION-1 (Certified)  
**Date:** 2026-07-14  
**Type:** Operational Presentation Adoption

---

## 1. Architecture audit

| Surface | Prior behaviour | Classification |
|---------|-----------------|---------------|
| Shared kitchen/ops formatters | `tableNumber > 0` → Table / else Take Away | Presentation reconstructed fulfilment |
| `mapOrderPresentation` | Built labels from `tableNumber` / tableUnit | Same |
| Kitchen + Expo cards | Consumed reconstructed label | Indirect violation |
| Orders Workspace | Same mapper path | Indirect violation |
| Print Workspace list/detail | Hardcoded `Table {tableNumber}` | Direct violation |
| Print payload text | `Table: {tableNumber}` | Direct violation |
| Dashboard OrdersTab (`order.list`) | `Table/Room {tableNumber}` | Legacy list; stamps used when present |
| Pickup role | Blocked / no order cards | N/A |

**Root cause:** Projection delivered fulfilment stamps on Operational DTOs, but presentation never adopted them.

---

## 2. Presentation ownership map

| Concern | Owner |
|---------|--------|
| Projected fulfilment facts | Order Read / Operational DTO (`serviceMode`, `fulfilmentAnchorType`, `fulfilmentLabel`) |
| Single display renderer | `formatProjectedFulfilmentLabel` (`client/.../formatProjectedFulfilment.ts`) |
| Active + Kitchen card mapping | `mapOrderPresentation` |
| Print Workspace cards | `toPrintWorkspaceOrderCard` + PrintWorkspacePanel detail |
| Print ticket text | `PrintPayloadTextSerializer` |
| Forbidden | Session Platform, Ordering Runtime, Business Identity, `resolveFulfilmentProjection` in UI |

---

## 3. Fulfilment presentation flow

```
Operational DTO (Kitchen / ActiveOrder / PrintWorkspace / PrintPayload)
        │
        ▼
formatProjectedFulfilmentLabel / localizedProjectedFulfilmentLabel
        │
        ▼
OrderPresentationModel.fulfillment.label  |  Print card label  |  Print text line
        │
        ▼
Kitchen / Expo / Orders / Print Workspace UI
```

**DTO consumption rules**

- Presentation reads `fulfilmentLabel`, `fulfilmentAnchorType`, `serviceMode` only.
- Table anchors: localize Table/Room prefix + projected label (e.g. `12` → `Table 12`).
- Other anchors: display projected label as stamped (`Station A`, `Pickup A`, …).
- Takeaway: localize known `Take Away` stamp to `سفري` in Arabic.
- No `tableNumber` heuristics for label derivation.

---

## 4. Architectural boundaries

**In scope:** Operational presentation formatters, mappers, Print Workspace UI labels, print text serializer, client KitchenTicketDto type sync  

**Out of scope:** Projection pipeline, Read Model, Order Domain, Runtime, Session, PlaceOrder, QR/Kiosk/Waiter channel UX, layouts, database  

**Deferred:** Public order status DTO has no fulfilment trio — not an Operational DTO path  

---

## 5. Compatibility

- QR table orders: projected label remains table number string → still renders `Table N`.
- Historical Operational DTOs: projection mapper already resolves stamps before presentation.
- Dashboard `order.list`: uses stamps when present; falls back to legacy table/room + `tableNumber` when stamps absent (non–Operational DTO path).

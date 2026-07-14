# ORDER-IDENTITY-RUNTIME-1 — Architecture

**Status:** Implemented  
**Depends on:** ADR-ARCH-019, KIOSK-ORDER-IDENTITY-ARCHITECTURE-1  
**Date:** 2026-07-14  
**Type:** Runtime foundation (no schema / session platform / ops changes)

---

## 1. Architecture audit

| Layer | tableId role | Classification |
|-------|--------------|----------------|
| `OrderingPlaceOrderCommand` | Was sole location key | Historical → now dual with `identity` |
| `PlaceOrderCommand` / Order Domain | Persist NOT NULL | Dual-write from table Fulfilment Anchor |
| DiningSession | Occupancy key | Unchanged (out of scope) |
| OrderingRuntimeContext | None previously | Now projects identity **policies** |
| QR / Kiosk clients | Send tableId/tableNumber | Unchanged API; server builds identity |
| Kitchen / Print | Display tableNumber | Out of scope |

**Separation:**

| Identity kind | Owner in this program |
|---------------|------------------------|
| Runtime identity | `OrderingOrderIdentity` + runtime `orderIdentity` policies |
| Operational identity | Session Platform (unchanged) — pointer only via `OperationalSessionIdentity` |
| Presentation identity | Fulfilment label on anchor (derived) |

---

## 2. Runtime ownership map

| Concern | Owner |
|---------|--------|
| Service Mode / Anchor vocabulary | `@shared/ordering-platform/orderingIdentityContract` |
| Runtime policy projection | OrderingRuntimeMaterializer → Context.orderIdentity |
| PlaceOrder identity assembly (QR table) | `order.create` router via `createTableOrderIdentity` |
| Domain dual-write bridge | `PlaceOrderService` + `resolvePlaceOrderTableFields` |
| Session lifecycle | Out of scope |
| Schema / BI / Ops UI | Out of scope |

---

## 3. Runtime contracts

- `OrderingServiceMode`, `OrderingFulfilmentAnchor`, `OrderingOperationalSessionIdentity`, `OrderingOrderIdentity`
- `OrderingRuntimeOrderIdentityPolicies` on `OrderingRuntimeContext.orderIdentity`
- Foundation default: `table_service` + `table` only
- `OrderingPlaceOrderCommand.identity` required on shared contract; legacy `tableId` retained for dual-compat

---

## 4. PlaceOrder pipeline

```
order.create(tableNumber, …)
      → resolve restaurant_tables
      → createTableOrderIdentity(table)
      → PlaceOrderService({ identity, tableId, tableNumber, … })
      → resolvePlaceOrderTableFields(identity)
      → Order.placeNew(table fields)   // domain/schema unchanged
```

Table ordering = Fulfilment Anchor type `table`. No pricing/validation/BI changes.

---

## 5. QR compatibility

- Routes, UX, `order.create` input shape unchanged  
- Behaviour identical: same table lookup, same persist fields  
- Identity is additive assembly on the server  

---

## 6. Boundaries

**In scope:** Shared identity contracts, runtime projection, PlaceOrder identity consumption, table dual-write bridge  
**Out of scope:** Session Platform, DB schema, non-table PlaceOrder activation, Kitchen/Expo/Print, Kiosk `?table=` removal

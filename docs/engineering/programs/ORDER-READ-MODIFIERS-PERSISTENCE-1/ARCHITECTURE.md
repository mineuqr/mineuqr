# ORDER-READ-MODIFIERS-PERSISTENCE-1 — Architecture

**Status:** Implemented  
**Date:** 2026-07-16  
**Type:** Ordering Read Model Persistence  

---

## 1. Objective

Persist Order Item modifiers through the official Order Read Model so Waiter, Kitchen, QR, and Kiosk consume the same projected business state.

---

## 2. Data flow

```
PlaceOrder (dual-write modifiers on order_items)
  → Order Aggregate (OrderLine.modifiers)
  → Order Read builders
  → order_read_order_line_items.modifiers
  → ActiveOrderLineItemDto.modifiers
  → Operational DTO / Runtime forward
  → Presentation
```

---

## 3. Ownership

| Layer | Responsibility |
|-------|----------------|
| Order Aggregate | Store modifier display labels (no pricing behavior change) |
| Order Read projection | Persist + expose `modifiers: readonly string[]` |
| Operational / Runtime | Forward projected modifiers only |
| Presentation | Display projected labels (no reconstruction) |

---

## 4. Non-goals

- No modifier pricing / catalog engine  
- No Ordering Runtime Materializer redesign  
- No Session Platform changes  
- No presentation-side aggregate queries  

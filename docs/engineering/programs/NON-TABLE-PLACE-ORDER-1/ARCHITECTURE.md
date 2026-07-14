# NON-TABLE-PLACE-ORDER-1 — Architecture

**Status:** Implemented  
**Depends on:** ADR-ARCH-019, ORDER-IDENTITY-RUNTIME-1, OPERATIONAL-SESSION-PLATFORM-1  
**Date:** 2026-07-14  
**Type:** Architecture Implementation (PlaceOrder identity activation)

---

## 1. Architecture audit

| Dependency | Classification |
|------------|----------------|
| QR `order.create` + `restaurant_tables` lookup | Production compatibility |
| `dining_sessions` table uniqueness | Production compatibility |
| `PlaceOrderCommand.tableId` as canonical identity | Architectural assumption → **broken** |
| `orders.tableId` / `tableNumber` NOT NULL | Legacy compatibility (sentinel dual-write) |
| Business Identity allocator | Independent — verified |
| Kitchen `tableNumber <= 0` → takeaway | Legacy presentation foreshadow |
| Session resolve table-only | Architectural assumption → **activated** for all anchors |

### Root cause

PlaceOrder treated `tableId` as canonical identity even after Order Identity and Operational Session platforms existed. Non-table channels were forced through fake tables or blocked.

---

## 2. Identity activation summary

**Canonical:**

```
PlaceOrder
   → OrderingOrderIdentity { serviceMode, fulfilmentAnchor, operationalSession }
   → resolveOperationalSession(sessionAnchorFromFulfilment)
   → Order Domain persist (legacy table dual-write)
```

| Anchor | Session persistence | Legacy table dual-write |
|--------|---------------------|-------------------------|
| `table` | persistent (Dining Session) | real tableId / tableNumber |
| `station` / `pickup_point` / `queue` / `drive_lane` | ephemeral (`sessionId` null) | `LEGACY_NON_TABLE_*` = 0 |

Sentinels are **not** `restaurant_tables` rows and do not create occupancy.

---

## 3. PlaceOrder ownership map

| Concern | Owner |
|---------|--------|
| Canonical identity | Ordering Platform (`OrderingOrderIdentity`) |
| Identity PlaceOrder orchestration | `IdentityPlaceOrderService` |
| Domain persist / pricing / BI | `PlaceOrderService` + Order Domain + Business Identity |
| Session resolve | Operational Session Platform |
| QR public API | `order.create` (table only — unchanged) |
| Channel UI | Out of scope |

---

## 4. Session integration

```
Fulfilment Anchor ──map──► Session Anchor ──► resolveOperationalSession
                                                      │
                                    table → Dining Session (persistent)
                                    other → ephemeral (no dining_sessions)
```

No channel-specific branching. No fake tables.

---

## 5. Business Identity

Allocator inputs: `orderId`, `restaurantId`, `createdAt` only.  
Independent of Fulfilment Anchor, Service Mode, and channel. Unchanged.

---

## 6. QR compatibility

- Routes, UX, Zod input, table lookup unchanged  
- Dual-write flag + table Operational Session unchanged  
- `createTableOrderIdentity` still used on QR path  
- Runtime materializer defaults remain `table_service` + `table`  

---

## 7. Future channel activation

Channels (Kiosk / Counter / Pickup UI) call `identityPlaceOrderService` with mode + anchor.  
UI programs remain separate. This program only activates the **platform capability**.

---

## 8. Boundaries

**In scope:** Identity PlaceOrder, persist dual-write, session resolve for all anchors (ephemeral non-table), contracts, tests, docs  

**Out of scope:** Channel UIs, ops/kitchen/print UI, nullable schema migration, BI redesign, QR UX

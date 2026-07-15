# WAITER-TABLE-WORKSPACE-1 — Architecture

**Status:** Implemented  
**Depends on:** WAITER-SCREEN-RUNTIME-ADOPTION-1, WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1, WAITER-ORDERING-FOUNDATION-1  
**Date:** 2026-07-16  
**Type:** Presentation + Operational DTO Adoption  

---

## 1. Objective

Transform Waiter into a true operational Table Workspace:

```
Floor overview (lightweight)
  → select table → attach session
  → Table Workspace (session + orders + items + notes + totals)
  → New order → Ordering Client browse/cart/checkout
```

---

## 2. Data ownership (unchanged)

```
Order Domain → Projection → Order Read Model
  → Waiter Operational DTO (assembler)
  → staff waiter.* / device runtime.*
  → Waiter Table Workspace presentation
```

| Owner | Responsibility |
|-------|----------------|
| Order Read | Projected orders + line items + notes + order totals |
| Dining session row | Maintained `totalOrders` / `totalAmount` / status / timing |
| Waiter channel | Floor overview + workspace UI + navigation |
| Session Platform | Attach only (existing `resolveOperationalSession`) |
| Ordering Platform | Place order (unchanged) |

Presentation does **not** query Session/Order services, calculate totals, or reconstruct orders.

---

## 3. Operational DTOs

| DTO | Use |
|-----|-----|
| `WaiterFloorTableDto` | Overview cards: table #, occupancy, order count, session total |
| `WaiterTableWorkspaceDto` | Workspace: session, orders, line items, notes, totals |

Assembler: `WaiterTableWorkspaceService` — reads `order_read_*` via `listOrdersBySessionId` + session aggregate fields.

---

## 4. Transport

| Mode | Floor | Workspace |
|------|-------|-----------|
| Dashboard | `trpc.waiter.listFloorTables` | `trpc.waiter.getTableWorkspace` |
| Hosted Screen | `screenTrpc…listWaiterFloorTables` | `screenTrpc…getWaiterTableWorkspace` |

---

## 5. Non-goals

- No Order Domain / materializer / Session Platform redesign  
- No Runtime Provider / Screen Runtime architecture changes  
- No Business Identity changes  
- Modifiers: Order Read does not project modifiers; DTO exposes `modifiers: []` until projection adds them  

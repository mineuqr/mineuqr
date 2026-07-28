# IMPLEMENTATION — OPERATIONAL-ORDER-CARD-PLATFORM-1

**Date:** 2026-07-29  
**Type:** Presentation Platform Adoption  
**Status:** COMPLETE  
**Do not commit / push / deploy**

---

## 1. Platform package

`client/src/design-system/operational-order-card/`

| Primitive | Role |
|---|---|
| `OperationalOrderCard` | Canonical shell + hierarchy |
| `OperationalOrderHeader` | Identity + channel/table |
| `OperationalOrderStatus` | SemanticBadge status |
| `OperationalOrderTimeline` | Elapsed / target / late |
| `OperationalOrderPriority` | Priority / overdue badges |
| `OperationalOrderDelay` | Delay warning strip |
| `OperationalOrderItems` / `Item` / `Quantity` / `Modifiers` / `Notes` | Structured item scan |
| `OperationalOrderFooter` | Execution meta row |
| `OperationalOrderActions` | Multi / single / none chrome |
| Density tokens | `compact` · `comfortable` · `kitchen` · `large-display` |
| Adapters | `mapWaiterOrderPresentation` · `mapDashboardOrderPresentation` |

Input SSOT remains `OrderPresentationModel` (`@/lib/order-presentation`). Optional `lineState` for cancelled/complimentary chrome.

---

## 2. Canonical hierarchy

1. Header (identity + fulfilment)  
2. Status row (SemanticBadge + priority + SLA timeline when applicable)  
3. Scrollable structured items (qty → name → modifiers → notes)  
4. Order notes + delay  
5. Financial (when enabled)  
6. Persistent footer / actions  

Long orders: fixed card + `overflow-y-auto` item viewport + sticky footer — no `+N more` truncation.

---

## 3. Migrated surfaces

| Surface | Adoption |
|---|---|
| Orders Workspace | `OperationalCard` → facade → platform |
| Kitchen / Expo | `KitchenExecutionCard` → facade → platform (`density="kitchen"`) |
| Waiter table orders | Direct `OperationalOrderCard` + waiter adapter |
| Dashboard Orders tab | Direct `OperationalOrderCard` + dashboard adapter; status mutations preserved outside |
| Print list | `OperationalOrderStatus` |
| DiningSessionOrdersList | `OperationalOrderStatus` |
| Pickup / Register order tickets | Still absent (N/A) |

---

## 4. Removed / retired duplicates

- Local Kitchen item table / execution footer implementations (moved into platform)
- Local Orders card header/SLA/item summary/actions markup
- Waiter local glass order articles
- Dashboard local order item/status/header markup (mutations retained as feature chrome)
- Local Print status text (now SemanticBadge via platform status)

Facades kept only as thin prop adapters for existing call sites.

---

## 5. Non-changes (constraints honored)

No changes to APIs, queries, DB, events, order/session/kitchen/payment workflow, routing, or permissions.

# QUERY DESIGN

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
Routers do not run SQL. POS services do not invent write-side queries.

## Layering

```
POS client (future)
  → pos.read.* (tRPC, auth + Zod)
  → Pos*ReadService (POS grant + terminal)
  → OrderReadWorkspaceService | OrderSettlementReadService | getMenuItemsByRestaurant
  → projection store / menu_items
```

## `listActive` (Q-01)

| Item | Design |
|------|--------|
| Tables | `order_read_orders`, `order_read_order_line_items` |
| Tenant predicate | `eq(orderReadOrders.restaurantId, context.restaurantId)` |
| Lifecycle | `lifecycleStage = operational` (existing `operationalLifecycleFilter`) |
| Status | optional pending/preparing/ready; `all-active` → no status predicate |
| Order | `createdAt` ASC |
| Limit | requested `limit` (default 50, max 100) + 1 for `hasMore` |
| Cursor | accepted on the POS/Order Read query type; **`DrizzleOrderOperationalReadStore.listActiveOrders` does not apply cursor** (inherited). `nextCursor` is last page item `createdAt` |
| Indexes used | `order_read_orders_restaurant_created`, `order_read_orders_restaurant_status`, `order_read_orders_restaurant_lifecycle` |
| N+1 | line items attached in a follow-up query per existing store (`attachLineItems`) — not introduced by POS |

Do not paginate in React. Do not scan write-side `orders`.

**Date range:** this API is **not** a date-range query. `businessDay` on each row is the projected restaurant business day (`shared/utils/businessDay.ts` at write/projection time). Callers must not interpret `createdAt` ISO prefixes as business days.

## `getDetail` / `getTimeline`

Equality on `(restaurantId, orderId)` against projection tables. Missing row → POS NOT_FOUND.

## `orderSettlement.listByOrder`

Delegates to `OrderSettlementReadService.listByOrder`, which currently lists restaurant projection rows then filters `orderId` (inherited). POS does not add a second store or SQL. Per-order result size is small; restaurant-wide `listByRestaurant` is **not** exposed on POS.

## `catalog.listItems`

`SELECT` menu items `WHERE restaurantId = ? ORDER BY sortOrder` via existing `getMenuItemsByRestaurant`. Then:

1. drop rows whose `restaurantId` ≠ authorized restaurant
2. optional `availableOnly`
3. `slice(0, 500)`

No new index. No join to orders/checks.

## Query count (happy path)

| API | Typical queries after auth |
|-----|----------------------------|
| listActive | 1 orders + 1 line-items (existing store) |
| getDetail | order + lines + timeline (existing) |
| listByOrder | 1 projection list (inherited restaurant scan + filter) |
| listItems | 1 menu select |

Auth path additionally: `getRestaurantById`, grant lookup, terminal get, entitlement `checkLimit` (existing PosAccessService). No occupancy write.

## SCHEMA CHANGE REQUIRED

**None.**

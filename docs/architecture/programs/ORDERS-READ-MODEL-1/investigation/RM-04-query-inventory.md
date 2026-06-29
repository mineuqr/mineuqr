# RM-04 — Query Inventory

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Order Domain Queries (`db.ts` + `orderRouter`)

| Query / Procedure | Caller(s) | Repository / Function | SQL / Filters | Pagination | Ordering | Aggregation | Caching | Polling |
|-------------------|-----------|----------------------|---------------|------------|----------|-------------|---------|---------|
| `order.list` | Dashboard (5+ components), Sessions | `getOrdersWithItemsByRestaurant` | `restaurantId`, optional `status` (unused by UI) | **None** | `createdAt DESC` | None | React Query | 10s / 120s stale |
| `order.getById` | Tests only | `getOrderById` + items | `id` | — | — | — | — | — |
| `order.activeCount` | Tests only | `getActiveOrdersCount` | status IN (pending, preparing, ready) | — | — | COUNT | — | — |
| `order.getPublicStatus` | `OrderStatusPage` | `getOrderByTrackingToken` | token + slug | LIMIT 1 | — | item COUNT subquery | React Query | 8s |
| `order.canOrder` | `MenuView`, `CheckoutPage` | `resolveGuestOrderingAllowed` | commercial gate | — | — | — | — | — |
| `getOrdersBySessionId` | Session workspace (internal) | `db.ts` | restaurantId + sessionId | None | `createdAt DESC` | None | — | — |
| `getOrderById` | Routers, consumers, repository | `db.ts` | `id` | — | — | — | — | — |
| `getOrderItemsByOrderId` | Nested in list, consumers | `db.ts` | `orderId` | None | — | — | — | — |

### N+1 Pattern — `getOrdersWithItemsByRestaurant`

```1064:1074:server/db.ts
export async function getOrdersWithItemsByRestaurant(
  restaurantId: number,
  status?: string
) {
  const orderList = await getOrdersByRestaurant(restaurantId, status);
  return Promise.all(
    orderList.map(async (order) => ({
      ...order,
      items: await getOrderItemsByOrderId(order.id),
    }))
  );
}
```

**Reusable:** Function is shared but always returns full restaurant history with all line items.

---

## Ops Queries (`server/ops/` + `opsRouter`)

| Procedure | Caller(s) | Function | Filters | Pagination | Aggregation |
|-----------|-----------|----------|---------|------------|-------------|
| `ops.getRestaurantOverview` | Home, Sessions | `getRestaurantOverview` | restaurantId | — | COUNT sessions, tables, active orders |
| `ops.getActiveTablesBoard` | Board sections | `getActiveTablesBoard` | restaurantId, active tables | — | pending orders per session |
| `ops.getActionCenter` | Home | `getActionCenter` | restaurantId, open sessions | — | duration filter |
| `ops.getActivityFeed` | Home, Sessions | `getActivityFeed` | restaurantId, limit (default/max capped) | LIMIT | merge + sort |
| `ops.getSettlementSummary` | Reports | `getSettlementSummary` | restaurantId, from?, to? | — | SUM paid revenue |
| `ops.getSettlementBreakdown` | *(no client grep match)* | `getSettlementBreakdown` | date range | — | by outcome |
| `ops.getSettlementTrend` | Reports | `getSettlementTrend` | restaurantId, grouping | — | time series |

**Constants:** `ACTIVITY_FEED_DEFAULT_LIMIT`, `ACTIVITY_FEED_MAX_LIMIT` in `operationalConstants.ts`.

---

## Session Queries

| Procedure | Caller | Function | Notes |
|-----------|--------|----------|-------|
| `session.getOwnerWorkspace` | `DiningSessionWorkspaceSheet` | `getOwnerSessionWorkspace` | Session + orders + events + aggregates |

---

## Notification Queries

| Procedure | Caller | Function | Filters |
|-----------|--------|----------|---------|
| `notification.getUnread` | `OrderAlertSystem`, header | `getUnreadNotifications` | userId, unread |
| `notification.list` | `Notifications.tsx` | `getNotificationsByUser` | userId |

---

## Commercial / Admin Reads (non-order-ops)

| Service | Path | Scope |
|---------|------|-------|
| `CommercialReadService` | `server/commercial/CommercialReadService.ts` | Admin commercial export |
| `wave1ReadAuthority` | `server/commercial/wave1ReadAuthority.ts` | Entitlement reads |
| `auditReadRepository` | `server/audit/auditReadRepository.ts` | Audit log reads |

---

## Consumer Internal Reads (not UI)

| Consumer | Read calls |
|----------|------------|
| `OrderNotificationConsumer` | `getRestaurantById`, `getOrderItemsByOrderId`, `getOrderById` |
| `OrderSessionConsumer` | `getOrderById` |
| `OrderPrintingConsumer` | `getOrderById` |

---

## Reusability Assessment

| Query | Reusable? | Issue |
|-------|-----------|-------|
| `getOrdersWithItemsByRestaurant` | Low | Monolithic payload; no active-only variant used |
| `getActiveOrdersCount` | High | Server aggregation but **unused** by client (ops embeds it) |
| `getOrdersBySessionId` | High | Narrow, session-scoped |
| Ops board/feed queries | High | Purpose-built DTOs |
| `buildOrderStatistics` (client) | **Should not exist** | Duplicates needed server analytics API |
| `order.list` + client filter | Low | Fetches all statuses/dates for filter chips |

---

## Missing Queries (per ADR-ARCH-009)

| Expected query | Status |
|----------------|--------|
| Owner active orders list (operational) | Missing — uses full list |
| Order today/month analytics | Missing — client computed |
| Order detail for owner workspace | Missing — uses full list |
| Kitchen queue | Missing |
| Print queue / job status | Missing |
| Order analytics read model endpoint | Missing |

---

## Caching Summary

| Layer | Mechanism |
|-------|-----------|
| Server | **None** — no HTTP cache headers, no server-side query cache |
| Client | React Query (tRPC) — key = procedure + input |
| Database | MySQL indexes (not audited in this investigation) |

---

## Polling Summary

See RM-08 for full polling audit. All owner operational reads use **fixed-interval client polling** except home snapshot `order.list` (staleTime 120s, no interval).

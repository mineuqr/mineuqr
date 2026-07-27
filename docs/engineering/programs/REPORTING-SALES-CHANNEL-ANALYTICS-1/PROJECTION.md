# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Projection Specification

## Projection name

Sales Channel Analytics (Order Sales plane)

## Source rows

`order_read_orders` where:

- `restaurantId` = query restaurant
- `status` = `served`
- `createdAt` within reporting period (`from` / `to`)

Adapter: `listServedOrdersForChannelReporting`

## Facts published per bucket

| Fact | Source |
|------|--------|
| Channel Identifier | `resolveReportingSalesChannel({ orderingChannel, identityScope })` |
| Channel Name | `reportingSalesChannelLabel` |
| Order Count | Count of served orders in bucket |
| Sales Amount | Sum of `totalAmount` (Order Sales) |
| Percentage of Total Sales | `sales / sum(bucket sales)` — service only |
| Percentage of Total Orders | `orders / sum(bucket orders)` — service only |
| Business Period | DTO `from` / `to` |
| Restaurant Id | Input |
| Business Identity | Via order identityScope on source row (fallback only) |

## Persistence prerequisites

Migration `drizzle/0083_order_ordering_channel.sql`:

- `orders.ordering_channel`
- `order_read_orders.ordering_channel`

Stamp at place:

- `order.create` → `qr`
- `order.placeAsWaiter` → `waiter_tablet`
- `order.placeWithIdentity` → client `OrderingChannelId` (kiosk / future)

Order Read materializer copies `source.order.orderingChannel` into the read model.

## Non-goals

- Does not project Check / Settlement Record revenue
- Does not project payment tenders
- Does not invent channels from UI, payment method, or session alone

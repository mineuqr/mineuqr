# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Architecture Specification

| Field | Value |
|-------|--------|
| **Program** | REPORTING-SALES-CHANNEL-ANALYTICS-1 |
| **Domain** | Reporting Platform |
| **Status** | Implemented — pending Architecture Authority approval |
| **Date** | 2026-07-27 |

## Ownership

| Concern | Owner |
|---------|--------|
| OrderingChannelId stamp at place | Ordering / Place Order APIs |
| Order write (`orders.ordering_channel`) | Order persistence |
| Order Read projection (`order_read_orders.ordering_channel`) | Order Read projection |
| Sales Channel Analytics aggregation | Reporting Platform (`SalesChannelAnalyticsService`) |
| Total Sales (Check Revenue) SSOT | Business Metrics / Settlement Record — **unchanged** |
| Payment Method Analytics | Settlement Record payment snapshots — **unchanged** |
| Presentation cards | Passive bind of `SalesChannelAnalyticsDto` |

## Metric plane (critical)

Sales Channel Analytics publishes **Order Sales by ordering channel** from **served Order Read** rows.

It does **not**:

- Replace Total Sales / Gross / Net Check Revenue
- Replace Payment Method Analytics
- Recalculate order totals, tax, refunds, or settlement

Dual-metric observation: channel sales totals reconcile to **sum of served order totals in period**, not necessarily to Check Revenue KPIs.

## Data flow

```
OrderingChannelId (place APIs)
        │
        ▼
orders.ordering_channel  ──►  Order Read projection
        │                         │
        │                         ▼
        │               order_read_orders.ordering_channel
        │                         │
        │                         ▼
        │               listServedOrdersForChannelReporting
        │                         │
        │                         ▼
        │               SalesChannelAnalyticsService
        │                         │
        │                         ▼
        │               SalesChannelAnalyticsDto
        │                         │
        ├─────────────────────────┼──────────────────────────┐
        ▼                         ▼                          ▼
reporting.getSalesChannelAnalytics   Dashboard Sales Source   (future Excel)
```

## Channel resolution

1. Prefer stamped `orderingChannel` → reporting sales channel id via `salesChannelReporting.ts`
2. Legacy fallback (pre-stamp history): `identityScope` WAITER → waiter, KIOSK → kiosk, TABLE → table
3. Unknown future OrderingChannelId values pass through as their own reporting id (automatic extensibility)

## Supported product cards

| Reporting id | Primary stamp |
|--------------|---------------|
| `table` | Legacy TABLE scope / future table-session registration |
| `waiter` | `waiter_tablet` |
| `qr` | `qr` (`order.create`) |
| `kiosk` | `kiosk` (`placeWithIdentity` + client channel) |

## Invariants

1. No UI-side aggregation of channel amounts or mix %.
2. No duplication of revenue or payment analytics formulas.
3. No Business Identity / Revenue / Settlement / Refund / Tax law changes.
4. Adding a channel requires OrderingChannelId + reporting map registration — not UI redesign.

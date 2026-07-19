# REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1 — Architecture

## Invariant

Given the same Write Model:

```
Incremental = Replay = Recovery = Backfill = Rebuild
```

for every P-10 Order Analytics `dayKey`, rollup, and KPI derived from it.

## Canonical ownership

| Concern | Owner |
|---------|--------|
| Business Day window / key resolution | `@shared/utils/businessDay` (`resolveBusinessDayKey`) — unchanged |
| **Which timestamp** feeds that resolver for Order Analytics | `orderAnalyticsBusinessDayKey(order.createdAt)` |
| P-10 formulas (`orderCount`, `completedOrderCount`, `completedSales`) | Unchanged (Order Read / KPI Governance) |
| Check Revenue / Tax / Settlement / Payment | Out of scope |

```
Business Event (OrderCreated | OrderCompleted)
  → load order.createdAt
  → orderAnalyticsBusinessDayKey(createdAt, workingHours)
  → resolveBusinessDayKey (certified Business Day)
  → P-10 materialization
  → Reporting reads
```

## Event ownership matrix (P-10)

| Domain event | Contributes | Governing timestamp for dayKey |
|--------------|-------------|--------------------------------|
| `OrderCreated` | `orderCount += 1` | `order.createdAt` |
| `OrderCompleted` | `completedOrderCount += 1`, `completedSales += totalAmount` | **`order.createdAt`** (not `servedAt`) |
| `OrderCancelled` | none (count retained from create) | n/a |
| `OrderStatusChanged` / Ready / Archive | none for P-10 | n/a |
| Check Paid / Settlement | n/a (Check / Settlement domains) | n/a |

## Non-ownership

Business Day assignment must **not** live in Dashboard, Reporting Service aggregators, Excel/PDF, repositories, or UTC/`slice(0,10)` helpers.

## P-06 note

Operational KPI (P-06) incremental deltas remain event-time (`envelope.occurredAt`) for live kitchen transitions. Snapshot rebuild places active orders by `createdAt`. That is a separate operational model — **not** Order Analytics determinism. This program unifies **P-10 only**.

## Forbidden

- `dayKeyFromTimestamp(envelope.occurredAt)` inside `adjustAnalytics`
- `dayKeyFromTimestamp(servedAt)` for P-10
- Alternate dayKey branches for incremental vs rebuild

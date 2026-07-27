# ORDERING-CHANNEL-GOVERNANCE-1 — Migration Report

## Schema

No new migration in this program. Relies on existing nullable `ordering_channel` columns
(`drizzle/0083_order_ordering_channel.sql` from REPORTING-SALES-CHANNEL-ANALYTICS-1).

## New writes

Every successful place persists a registered `OrderingChannelId`.

## Historical rows

| Condition | Reporting behavior |
|-----------|-------------------|
| `ordering_channel` set | Mapped via registry |
| `ordering_channel` null | Bucket `unassigned` — **no** identityScope TABLE/WAITER/KIOSK inference |

## Data integrity

- No backfill rewrite of historical rows in this program (avoids speculative QR vs table attribution)
- No corruption of Check / Settlement / Business Identity columns
- Totals still reconcile within Sales Channel Analytics (`sum(buckets)`)

## Observation

Operators may see an `unassigned` slice for pre-governance history until optional future backfill policy is approved separately.

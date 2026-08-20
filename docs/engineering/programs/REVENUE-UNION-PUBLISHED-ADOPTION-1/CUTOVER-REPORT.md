# REVENUE-UNION-PUBLISHED-ADOPTION-1 — Cutover Report

**Pipeline cutover: PUBLISHED**
**Collection Fact contribution: NOT ADOPTED**
**Financial facts: not rewritten**

## Before

```
Settlement Record gen=1
        ↓
businessMetricsAggregator
        ↓
Published Revenue DTO
```

Revenue Union existed as shadow compute only (`computeShadowRevenueUnion`). Dashboard did not call it.

## After

```
Settlement Record gen=1  +  payment_collection_facts (read-only)
        ↓
Revenue Union (eligibility = published)
        ↓
Authority resolution
        ↓
Published Revenue DTO
```

Default: `REPORTING_REVENUE_UNION` unset/`published`.

There is one published pipeline. Shadow comparison is in-process only.

## Why Collection Fact money is not cut over

1. No persistable `production` purpose (schema stop).
2. No Collection Fact-native refund / void / complimentary kinds.
3. Isolated purposes must never publish.

The published layer is **capable** of consuming Collection Fact authority when a later governed producer and allowlist exist. It does not consume them now.

## Rollback (publication layer only)

Set `REPORTING_REVENUE_UNION=legacy`.

This restores the previous aggregator. It must **not** delete Collection Facts, mutate Checks, or rewrite Settlement Records.

## Production safety checklist

- [x] No Collection Fact writes
- [x] No Cashier / Confirm / PAID change
- [x] No Check schema/lifecycle change
- [x] No Settlement writer change
- [x] No historical backfill
- [x] No new `payments` table
- [x] No 0097 migration
- [x] Empty-CF Union = legacy (tests)
- [x] Isolated facts rejected from published Gross

## Certification statement

**PASS — IMPLEMENTED / VALIDATED — PUBLISHED**

Collection Fact contribution remains **NOT ADOPTED**.

Do **not** declare `PASS — REVENUE UNION PUBLISHED ADOPTION CERTIFIED` until a separately governed persistable production purpose **and** Collection Fact-native compensating events exist, and published CF contribution is proven without double count.

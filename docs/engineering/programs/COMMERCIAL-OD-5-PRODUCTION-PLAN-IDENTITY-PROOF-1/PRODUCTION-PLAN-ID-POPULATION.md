# PRODUCTION-PLAN-ID-POPULATION

Source: current production `user_subscriptions`, 2026-08-15.

**Total rows: 7**

| Legacy planId | Row count | active | trial | canceled | expired | period already ended | Stripe sub |
|--------------:|----------:|-------:|------:|---------:|--------:|---------------------:|-----------:|
| 30001 | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| 30002 | 4 | 3 | 0 | 0 | 1 | 4 | 0 |
| 30003 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |

Status totals: **active 5**, **expired 2**, trial 0, canceled 0.

Schema: `planId` is `int NOT NULL` (INFORMATION_SCHEMA `IS_NULLABLE = NO`).  
NULL / 0 / negative counts: **0 / 0 / 0**.

Historical 2026-08-14 (5 rows, 30002×4 + 30003×1) is **stale**. Current population includes **30001** and a second **30003**. Proof uses current counts only.

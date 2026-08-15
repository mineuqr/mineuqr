# DATA PRESERVATION

Before → after business counts are identical.

| Table | Before | After |
|-------|-------:|------:|
| user_subscriptions | 7 | 7 |
| commercial_subscription_bindings | 3 | 3 |
| commercial_subscription_charged_terms | 0 | 0 |
| commercial_plans | 3 | 3 |
| commercial_prices | 10 | 10 |
| commercial_subscription_concessions | ABSENT | PRESENT, **0 rows** |

Subscription identities, period ends, Binding leftover amounts (19.00 / 19.00 / 29.00), and snapshot count are unchanged.

## 780001

Unchanged:

- active / yearly
- plan `d836bd10-9d9f-4408-a076-f921354d785a`
- `currentPeriodEnd` `2027-06-21T10:47:36.000Z`
- unbound

## Unexpected DML

Business-table INSERT / UPDATE / DELETE = **0**.  
No historical concessions. No test concessions. No backfill.

MRR/ARR unchanged because concession rows = 0 and snapshots remain 0.

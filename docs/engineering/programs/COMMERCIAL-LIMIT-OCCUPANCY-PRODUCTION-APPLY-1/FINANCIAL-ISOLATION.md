# FINANCIAL ISOLATION

Baseline vs post-apply (including after no-op second migrate).

| Table | Before | After | Delta |
|-------|-------:|------:|------:|
| orders | 44 | 44 | 0 |
| operational_checks | 43 | 43 | 0 |
| settlement_records | 41 | 41 | 0 |
| crmp_registers | 2 | 2 | 0 |
| crmp_financial_shifts | 7 | 7 | 0 |
| user_subscriptions | 8 | 8 | 0 |
| commercial_subscription_bindings | 4 | 4 | 0 |
| commercial_subscription_charged_terms | 1 | 1 | 0 |
| commercial_subscription_concessions | 0 | 0 | 0 |
| commercial_plans | 3 | 3 | 0 |
| commercial_prices | 10 | 10 | 0 |
| restaurants | 4 | 4 | 0 |
| categories | 7 | 7 | 0 |
| menu_items | 11 | 11 | 0 |
| pos_terminals | 0 | 0 | 0 |
| pos_permission_grants | 0 | 0 | 0 |
| pos_sale_idempotency | 0 | 0 | 0 |
| commercial_limit_occupancy_locks | (absent) | 0 | schema only |

## 780001

| Field | Before | After |
|-------|--------|--------|
| status | active | active |
| billingCycle | yearly | yearly |
| planId | `d836bd10-9d9f-4408-a076-f921354d785a` | same |
| currentPeriodEnd | `2027-06-21T10:47:36.000Z` | same |

780001 | UNTOUCHED

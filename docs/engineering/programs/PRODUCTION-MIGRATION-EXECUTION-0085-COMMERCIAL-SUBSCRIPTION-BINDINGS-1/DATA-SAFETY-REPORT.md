# DATA-SAFETY-REPORT — 0085

## Platform counts (pre = post)

| Entity | Count |
|--------|------:|
| orders | 33 |
| order_read_orders | 33 |
| settlement_records | 30 |
| operational_checks | 33 |
| user_subscriptions | 5 |
| subscription_plans | 3 |
| restaurants | 6 |
| users | 3 |
| commercial_plans | 0 |
| commercial_snapshot_definitions | 0 |
| commercial_subscription_bindings (post) | 0 |

## Assertions

- Migration is **additive DDL only**  
- **No unexpected DML** on tenant/business tables  
- Sessions / orders / checks / subscriptions / restaurants / users / reporting row counts **unchanged**  
- **Zero data loss**

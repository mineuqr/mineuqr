# TIDB TEST PLAN

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Target

| Item | Value |
|------|-------|
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Database | mineuqr |
| Connection | G07_DATABASE_URL only |
| Isolation check | `verdict === ACCEPT_NON_PRODUCTION`, `sameSqlUserAsProductionMain === false` |
| Owners | 983001001, 983001002 |
| Pools | independent `pool` + `poolB` |

Do not use DATABASE_URL, main, Production, tidbcloud_prod.

## Cases

1. Identity
2. Restaurant create after 2 → 1 cap
3. Edit + delete until create is permitted (`occupancy + 1 <= cap`)
4. Hide category after downgrade (G-10 COUNT)
5. Catalog reactivate after downgrade
6. Item cap independent of restaurants
7. Upgrade 1 → 3 immediately allows create
8. Owner ∥ admin creates after downgrade both denied
9. POS provision reject + deactivate + reactivate-at-cap
10. POS replace occupancyDelta 0 at over-cap
11. Cross-tenant isolation
12. Sequential downgrade-then-create and create-then-downgrade
13. Overlapping downgrade ∥ create
14. Failure after insert rolls back
15. G-06 error mapping

## Regressions (serial)

- G-07 P8 POS provision
- G-08 P12 restaurant delete vs category create
- Cascade TOCTOU category
- G-09 owner ∥ admin last slot
- G-10 inactive category occupies

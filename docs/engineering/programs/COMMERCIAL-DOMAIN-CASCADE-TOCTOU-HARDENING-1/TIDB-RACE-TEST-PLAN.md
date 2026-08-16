# TIDB RACE TEST PLAN

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

## Environment

| Item | Value |
|------|--------|
| URL | G07_DATABASE_URL only |
| Branch | mineuqr-stagIn |
| Database | mineuqr |
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Connections | Independent mysql2 pools `pool` / `poolB` (`db` / `dbB`) |
| Forbidden | Sequential-as-proof, in-memory mocks as proof, shared txn, Production `DATABASE_URL` |

## Actors

Synthetic owners `980901901` (A) and `980901902` (B). Cleanup limited to those userIds.

## Matrix

| # | Race | Expected |
|---|------|----------|
| 1 | DELETE ∥ category CREATE | restaurant 0, categories 0 |
| 2 | DELETE ∥ item CREATE | restaurant 0, items 0, categories 0 |
| 3 | DELETE ∥ POS provision | restaurant 0, terminals 0 |
| 4 | DELETE ∥ POS replace | restaurant 0, terminals 0 |
| 5 | DELETE ∥ order CREATE | restaurant 0, orders 0 |
| 6 | Covered by 1–5 + 9 | Other A-class resources |
| 7 | DELETE ∥ DELETE | restaurant 0, children 0 |
| 8 | CREATE ∥ CREATE | restaurant 1, categories = cap, occupancy safe |
| 9 | CREATE ∥ DELETE ∥ CREATE | if restaurant 0 then categories 0 |
| 10 | Tenant A DELETE ∥ tenant B CREATE | A gone; B restaurant 1 + category 1; not globally blocked |

## Final-state SQL (every race)

Restaurant existence, child counts by `restaurantId` / `scopeId`, orphan implied by child>0 ∧ restaurant=0.

## Failure injection

Throw after parent lock + child INSERT; expect rollback (categories 0, restaurant 1).

## Not accepted as proof

MySQL 8 substitution. `G07_REQUIRE_TIDB=1` fail-stops without G07 URL. Identity `sameSqlUserAsProductionMain` must be false.

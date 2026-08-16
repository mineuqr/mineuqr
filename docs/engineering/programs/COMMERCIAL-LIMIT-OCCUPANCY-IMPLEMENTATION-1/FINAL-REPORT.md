# FINAL REPORT

PROGRAM: COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1

STATUS: PASS — LOCALLY CERTIFIED

COMMERCIAL OWNERSHIP: PASS

SHARED OCCUPANCY PRIMITIVE: PASS

TENANT-SCOPED LOCK: PASS

FOR UPDATE: PASS

CHECK LIMIT: PASS

COUNT OCCUPANCY: PASS

ATOMIC DOMAIN CREATE: PASS

ROLLBACK: PASS

TENANT ISOLATION: PASS

CROSS-TENANT CONCURRENCY: PASS

SAME-TENANT CONCURRENCY: PASS

REAL DATABASE CONCURRENCY: PASS (isolated Docker MySQL 8.0; not Production TiDB)

FAIL-CLOSED: PASS

RESOURCE OWNERSHIP: PASS

POS CONSUMPTION: PASS

NO POS-SPECIFIC LOCK: PASS

NO SECOND COUNTER: PASS

NO GLOBAL LOCK: PASS

REGRESSION: PASS (56 files / 377 tests; predecessor 53 / 359)

BUILD: PASS

CHECK: 188 preexisting `error TS*` — matches baseline 188

MIGRATION: CREATED (`0094_commercial_limit_occupancy_locks`)

PRODUCTION MIGRATION: 0

PRODUCTION DATA MUTATION: 0

COMMIT: NONE

PUSH: NONE

DEPLOY: NONE

CRITICAL BLOCKERS: none

NON-BLOCKING RISKS:
- Occupancy code must not deploy to Production before 0094 is applied (fail-closed, not silent unlimited)
- Concurrency proven on MySQL 8 InnoDB, not live TiDB
- Platform admin still skips category/item quantity occupancy (existing policy)
- Owner onboarding first restaurant still inserts without occupancy (0→1)
- Restaurant/category/item creates remain non-idempotent under lost-response retry
- Inactive restaurant/category/item rows still count toward occupancy (existing COUNT semantics)

REQUIRED NOW:
- Tenant lock table 0094 (created, not applied)
- `withCommercialLimitOccupancy`
- Adoption of restaurants, categories, items, POS terminals
- Isolated real-database concurrency proofs
- Architecture guards

REQUIRED FOUNDATION FOR FUTURE:
- Production Apply of 0094
- Staging/Production TiDB occupancy drill after apply
- Deploy occupancy-adopting code only after the table exists

SAFE TO DEFER:
- Quantity occupancy for `staffAccounts`, `branches`, `devices`
- Plan-downgrade freeze / excess deactivation
- Onboarding-path occupancy wrap
- Restaurant/category/item create idempotency keys
- Removing unused `PosEntitlementService` constructor argument

SHOULD NEVER BE INTRODUCED:
- POS-specific occupancy lock or occupancy service
- Locking `commercial_limit_values` or Live Plan rows for occupancy
- Global occupancy lock
- Second occupancy counter as source of truth
- Second commercial / limit system
- Reservations / distributed locks / application-memory locks as the occupancy primitive
- Treating a bare COUNT+INSERT transaction as sufficient serialization

NEXT PROGRAM: POS-READ-APIS-IMPLEMENTATION-1

FINAL: STOP

# CONCURRENCY

## Proof environment

Isolated Docker MySQL **8.0** (`mineuqr-occupancy-test`, host port **3307**). Fixture table `occupancy_test_terminals` created by `occupancyTestMysql.ts`. Injected `db` into `withCommercialLimitOccupancy`.

**Not** Production TiDB. **Not** in-memory unlocked Vitest. **Not** application-memory locks.

## Invariants proven (5 new cases)

| Case | Result |
|------|--------|
| Valid replace, cap 1, occupancy 1 | Occupancy remains **1** |
| Two concurrent replaces of the **same** terminal, cap 1 | One winner, one `already_replaced`, occupancy **1** |
| Two concurrent replaces of **different** terminals, same restaurant, cap 2 | Both succeed, occupancy **2** |
| Concurrent replace Restaurant A and Restaurant B | Both succeed; counts isolated |
| `create` throws after lock | Occupancy unchanged; previous still provisioned |

## Same restaurant at the commercial terminal limit

Covered by the same-terminal concurrent case at cap 1 and the sequential domain test: after a valid provisioned replace, a new `register` is denied (`POS_ENTITLEMENT_DENIED`). Occupancy never exceeds cap.

## What this does not prove

- Production TiDB lock/deadlock behavior (audit G-07 / G-08)
- Multi-instance app servers against one TiDB cluster
- Domain `pos_terminals` table race on MySQL (fixture models the same COUNT+INSERT+UPDATE pattern under the shared lock)

## Unlocked unit tests

`NODE_ENV === "test"` without injected `db` still skips `FOR UPDATE`. Those tests prove **delta 0 decision** and domain `already_replaced`, not database serialization.

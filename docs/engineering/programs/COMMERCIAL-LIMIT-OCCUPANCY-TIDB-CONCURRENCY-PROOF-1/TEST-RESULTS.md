# TEST RESULTS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Date:** 2026-08-16  
**Harness:** `server/subscription-runtime/__tests__/commercialLimitOccupancy.tidb.concurrency.test.ts`  
**Primitive:** `withCommercialLimitOccupancy()` with injected Drizzle `db` (locked path)

## Command / result

```
G07_REQUIRE_TIDB=1 pnpm exec vitest run server/subscription-runtime/__tests__/commercialLimitOccupancy.tidb.concurrency.test.ts --reporter=verbose
```

| Metric | Value |
|--------|--------|
| Files | 1 failed |
| Tests | **8 failed / 4 passed / 12 total** |
| Duration | 48.82s |
| Production `DATABASE_URL` | not used to connect |
| Docker MySQL 8 | not used |

## Engine (from live session)

| Field | Value |
|-------|--------|
| VERSION() | `8.0.11-TiDB-v8.5.3-serverless` |
| DATABASE() | `mineuqr` |
| @@transaction_isolation | REPEATABLE-READ |
| @@autocommit | 1 (session; transactions still `BEGIN`) |
| @@tidb_txn_mode | pessimistic |
| @@tidb_lock_wait_timeout | null (variable not exposed) |
| 0094 PK | `scopeKind,scopeId,limitKey` |
| Lock table existed before drill | yes |

## Connection model

- `G07_DATABASE_URL` only
- Two mysql2 pools (`connectionLimit: 8` each), TLS
- Drizzle `db.transaction` → `BEGIN` on a checked-out pool connection, `COMMIT`/`ROLLBACK`, then release
- Concurrent ops: `Promise.all` / `Promise.allSettled`
- Phase 14: two OS processes via `pnpm exec tsx occupancyTidbWorker.ts`
- P6 recorded distinct `CONNECTION_ID()` values `2858418190` and `2858418186`

## Scenario results

| ID | Result | Occupancy invariant |
|----|--------|---------------------|
| P4 same-tenant last slot (cap 2, occ 1, 2 creates) | **FAIL** — both fulfilled | **violated** (expected occ 2, both creates succeeded) |
| P5 at-cap concurrent create | **FAIL** — start occupancy already **3** (cap 2) | **violated** (P4 leftover) |
| P6/P16 cross-tenant | PASS — A=2 B=2, 2 connection IDs | held per tenant |
| P7 independent limit keys | PASS — restaurants=1 and categories=1, two lock rows | held |
| P8 POS provision last slot | **FAIL** — both provisions fulfilled | **violated** |
| P9 occupancyDelta 0 replace | **FAIL** — both replacements fulfilled | occupancyDelta 0; lifecycle serialization **failed** |
| P10 rollback then retry | PASS — occ 0 after throw, 1 after retry | held |
| P11/P13 lock wait two pools | **FAIL** — both fulfilled | **violated** |
| P12 8-way contention cap 1 | **FAIL** — timed out 5000ms | not completed |
| P14 two OS processes last slot | **FAIL** — both processes `ok: true` | **violated** |
| P15 G-06 mapper | PASS (in-process class mapping) | n/a |
| Identity assertion `isExactProductionTarget` | FAIL (stale test field; identity still ACCEPT_NON_PRODUCTION) | n/a |

## G07_EVIDENCE (stdout, credentials omitted)

Identity verdict `ACCEPT_NON_PRODUCTION`, user prefix distinct from Production main, host is the shared TiDB Cloud gateway with branch SQL user.

Passed evidence: p6 distinctConnections=2; p7 lockKeys categories+restaurants; p10 afterRollback=0 afterRetry=1; p15 mapper distinct.

Failed scenarios did not record success evidence objects (assertions threw first).

## Failures that matter

The occupancy helper did **not** serialize two overlapping same-lock creates on this TiDB engine. Cap was exceeded. This is not a Vitest unlocked-path result: `db` was injected.

## Cleanup

Vitest `afterAll` called `cleanupG07Fixtures` for scopes 970701–970703. Lock mutex rows for those scopes may remain (by design).

# FINAL REPORT

**PROGRAM:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** ARCHITECTURE GAP CONFIRMED  
**MODE:** AUDIT → REAL-TIDB DRILL → VERIFY → CERTIFY  
**PREDECESSOR:** COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1  

The occupancy primitive was exercised on **actual TiDB**. Same-tenant concurrent create **exceeded the Commercial cap**. The architecture was **not** redesigned in this program.

---

## TIDB VERSION

`8.0.11-TiDB-v8.5.3-serverless`

## TEST DATABASE IDENTITY

TiDB Cloud branch **mineuqr-stagIn**, database **mineuqr**. SQL user distinct from Production main. `G07_DATABASE_URL` only.

## PRODUCTION SAFETY RESULT

PASS. Production not connected for the drill. Production mutation 0.

## MIGRATION STATE

0094 present on the branch (Phase 2). Journal hash exactly once. No new migration in this phase.

## TRANSACTION ISOLATION

REPEATABLE-READ. `tidb_txn_mode` = pessimistic. Session autocommit=1; Drizzle issues `BEGIN`/`COMMIT`.

## CONNECTION STRATEGY

Two mysql2 pools + TLS. Injected Drizzle `db` (locked path). Phase 14: two OS processes. P6: two `CONNECTION_ID`s.

## LOCKING STRATEGY

Unchanged: lock row PK `(scopeKind, scopeId, limitKey)` → `SELECT … FOR UPDATE` → COUNT → decide → create. **Did not serialize same-key concurrent creates on this engine.**

## SAME-TENANT RESULT

**FAIL.** Cap 2, occ 1, two concurrent creates: both succeeded. Follow-on occupancy **3**.

## AT-CAP RESULT

**FAIL.** Occupancy already 3 before at-cap racers (P4 overflow).

## CROSS-TENANT RESULT

**PASS.** A=2 B=2. Distinct connections.

## POS TERMINAL RESULT

**FAIL.** Two concurrent provisions both succeeded at last slot.

## PROVISIONED REPLACE RESULT

**FAIL.** Two concurrent `occupancyDelta=0` replacements both succeeded.

## ROLLBACK RESULT

**PASS** (single transaction throw + retry).

## LOCK CONTENTION RESULT

**FAIL.** Two pools, delayed T1: both succeeded.

## DEADLOCK / RETRY RESULT

**INCOMPLETE.** P12 timed out at 5s. Retry policy not changed.

## ERROR SEMANTICS RESULT

G-06 mapper PASS in-process. Contention did not produce a limit-exceeded loser (both racers succeeded).

## TENANT ISOLATION RESULT

**PASS** for independent scopes/keys (P6/P7). Does not offset same-tenant failure.

## REAL PARALLELISM RESULT

**PASS as methodology** (two pools, two CONNECTION_IDs, two processes). Serialization still failed.

## MULTI-INSTANCE RESULT

**FAIL.** Two processes both created on last slot.

## PERFORMANCE OBSERVATIONS

Same-tenant double-create completed in ~1.5–3.5s (no lock-wait on the loser). P12 8-way timed out at 5s. Not optimized.

## TARGETED TESTS

12 TiDB tests: 4 passed, 8 failed.

## REGRESSION TESTS

Not run as G-07 certification.

## BUILD / CHECK

NOT RUN (no occupancy architecture edit).

## DATABASE MUTATION

Synthetic `occupancy_g07_*` rows on **mineuqr-stagIn** only. `afterAll` deleted fixture scopes 970701–970703.

## PRODUCTION MUTATION

NONE

## MIGRATION

NONE this phase

## COMMIT / PUSH / DEPLOY

NONE

## REMAINING RISKS

If this helper is deployed to Production TiDB Cloud, same-tenant last-slot races can exceed Commercial quantity caps (restaurants, categories, items, POS terminals) and concurrent provisioned replace may double-apply.

## ARCHITECTURE GAPS

**CONFIRMED.** `withCommercialLimitOccupancy()` + 0094 `SELECT … FOR UPDATE` did not preserve `occupancy <= cap` under real concurrent TiDB transactions on `mineuqr-stagIn`.

Possible investigation (not done here): TiDB Serverless lock behavior for `INSERT … ON DUPLICATE KEY UPDATE` + `FOR UPDATE`; whether COUNT in REPEATABLE-READ sees a snapshot despite the mutex. **No Redis / app / POS / global lock was added.**

## NEXT PROGRAM

A governed follow-up to this gap. **Do not start G-08 from this certification.** Do not deploy occupancy (G-02) until the gap is addressed.

## FINAL

**STOP AFTER G-07 CERTIFICATION**

**STATUS: ARCHITECTURE GAP CONFIRMED**

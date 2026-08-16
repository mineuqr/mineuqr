# FINAL REPORT

**PROGRAM:** POS-PROVISIONED-REPLACE-OCCUPANCY-HARDENING-1  

**STATUS:** PASS — LOCALLY CERTIFIED  

**PREDECESSOR:** COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1 (finding G-01 REQUIRED NOW)

---

## AUDIT RESULT

Verified in code, not only the audit report.

Path: `posRouter.terminal.replace` → `assertRestaurantAccess` → `PosTerminalService.replace` → store insert + `updateLifecycle(..., "replaced")`.

Bypass: provisioned previous (`registered` / `active`) called `performReplace(null)`, skipping `withCommercialLimitOccupancy`. Unprovisioned replace already used the helper with delta 1.

Domain is **true replacement**: new `registered` row + previous `replaced`. Net provisioned COUNT unchanged **if** insert and mark-replaced are atomic. Concurrent two replaces of the same terminal could insert two replacements and leave occupancy above `posTerminals`.

## ROOT CAUSE

Slot-neutral replace was implemented by **skipping** the Commercial occupancy transaction instead of participating with `occupancyDelta: 0`. Serialization and COUNT+mutate atomicity were therefore absent on the provisioned path.

## REPLACEMENT SEMANTICS

**A — true replacement, net occupancy unchanged** for a provisioned previous.

Sequence inside one occupancy transaction: re-read previous → insert replacement `registered` → mark previous `replaced`. Temporary N+1 is not visible to other occupancy transactions waiting on the tenant lock.

Unprovisioned previous still uses `occupancyDelta: 1`. If lifecycle changes between the pre-lock read and the locked re-read, replace fails closed (`lifecycle_conflict`).

## OCCUPANCY DELTA DECISION

**`occupancyDelta: 0`** for provisioned previous. Forensic evidence did **not** show a lasting extra occupied terminal. Delta 1 was not used to “make tests pass.”

## TRANSACTION RESULT

`PosTerminalStore` already accepted `tx`. Occupancy helper `tx` is passed into `getById`, `insert`, and `updateLifecycle`. No second `getDb()` on the locked path. **No architectural blocker.**

## COMMERCIAL OWNERSHIP RESULT

POS remains a consumer. Helper still owns tenant lock, `SELECT … FOR UPDATE`, occupancy COUNT callback, transaction, rollback. No POS lock, no second counter, no second limiter, `posTerminals` meaning unchanged.

## TENANT ISOLATION RESULT

Lock remains restaurant + `posTerminals`. Isolated MySQL 8: Restaurant A and B concurrent replace both succeed; occupancy isolated.

## TERMINAL ISOLATION RESULT

`requireOwned` + locked restaurantId check unchanged. Router still `assertRestaurantAccess` / `pos.terminal.replace`. POS_ACCESS not weakened. No new permission.

## IDEMPOTENCY RESULT

No replace idempotency **key** table existed; none invented. Repeat replace of the same identity is `already_replaced` (sequential domain + concurrent real-DB). Occupancy defect closed via Commercial serialization, not a POS idempotency redesign.

## CONCURRENCY RESULT

Isolated Docker MySQL **8.0** (not Production TiDB): same-terminal one winner occupancy 1; different terminals occupancy stays 2; cross-tenant both succeed; no occupancy corruption.

## ROLLBACK RESULT

When `create` throws after lock, occupancy and previous provisioned row remain unchanged (MySQL 8).

## REGRESSION RESULT

Combined suite **56 files / 385 tests / 0 failed** (predecessor occupancy 377; **+8** this program). Build PASS. Check **188** `error TS*` (baseline). Unrelated tests not edited.

## DATABASE MUTATION

Local isolated MySQL occupancy-test container only. Application databases unused by this program’s concurrency proofs.

## PRODUCTION MUTATION

**0** — no Production migrate, data, provision, plan, deploy.

## MIGRATION

**NONE.** 0094 not modified. 0095 not created.

## BUILD

PASS

## CHECK

188 `error TS*` — matches baseline

## TARGETED TESTS

PASS (domain, guards, unlocked occupancyDelta 0)

## REGRESSION TESTS

PASS (56 / 385)

## REMAINING RISKS

- Application occupancy code still **undeployed** (audit G-02).  
- Git commit / governance terminus 0094 not done here (G-03).  
- Production **TiDB** concurrency not proven (G-07 / G-08).  
- Other audit items G-04…G-11 unchanged (onboarding, cascade POS, error mapping, admin menu policy, inactive occupancy, freeze).  
- Unlocked `NODE_ENV === "test"` helper path is not concurrency proof (unchanged predecessor behavior).

None of these re-open G-01 in local source.

## DEFERRED ITEMS

All comprehensive-audit items except G-01. Explicitly **not** started: POS-READ-APIS-IMPLEMENTATION-1.

## NEXT PROGRAM

Remaining Commercial occupancy audit work, in the order already recorded:

1. GIT COMMIT / PUSH occupancy + G-01 + 0094 journal + governance terminus 0094 (G-03) — **not this program**  
2. COMMERCIAL-LIMIT-OCCUPANCY-APPLICATION-DEPLOY-1 (G-02)  
3. G-04…G-08 then G-09…G-11 policy  
4. Only then POS-READ-APIS-IMPLEMENTATION-1  

This program’s name implements audit item **G-01** (also listed as COMMERCIAL-LIMIT-OCCUPANCY-POS-SLOT-NEUTRAL-LOCK-1).

## FINAL

**STOP.**

G-01 is closed locally. Do not continue to POS-READ-APIS-IMPLEMENTATION-1. Do not commit, push, or deploy from this program.

# PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1

**Classification:** `PASS WITH INSUFFICIENT-SAMPLES`  
**Kind:** Observability / measurement only. No optimization. No financial behavior change.  
**HEAD at start:** `7c4d4548631b10f3672c8a09c9653ac52a764696`  
**Commit at start:** `perf(cashier): instrument payment readiness latency`  
**Previous program:** `PAYMENT-READINESS-CHECK-ENSURE-FORENSICS-1` (`BOTTLENECK-LOCALIZED-BUT-NOT-MEASURED`)  
**Commit:** none (not requested)

---

## 1. Executive Summary

`pos.check.intake` already measured **`checkEnsureMs ≈ 3455 ms`** as a single blob: the entire `ensureCheckForOrder` call. This program adds **server-side stage clocks** at the existing sequential boundaries so a future production sample can decompose that blob.

Clocks use **`Date.now()`** (same as POS `startPosCommandClock` / Check `elapsedSinceMs`). Results are emitted as structured **`[OPS][ORDER][info]`** events:

- `check_ensure_for_order` from Check Domain
- `pos_check_intake` extended with the same stage metadata

Financial sequencing, transaction boundaries, Charge row-by-row INSERTs, duplicate Charge reads, Order Settlement placement, and Settlement Record absence on this path are **unchanged**.

This environment did **not** collect 10 live Cashier Check Intake samples. Inner-stage production timings remain **UNKNOWN**. Do not pick an optimization target from the 3455 ms sample.

---

## 2. Baseline

```
git rev-parse HEAD
7c4d4548631b10f3672c8a09c9653ac52a764696

git log -1 --oneline
7c4d4548 perf(cashier): instrument payment readiness latency
```

Known production sample (forensics; **not** a stage breakdown):

| Field | Value |
|---|---|
| Timestamp | 2026-08-19 18:33:31Z |
| Order | 6990033 |
| Check | 1650058 |
| `pos.check.intake` `durationMs` | 4148 |
| `authMs` | 595 |
| `orderLoadMs` | 98 |
| **`checkEnsureMs`** | **3455** |

`checkEnsureMs` is **MEASURED** at the `ensureCheckForOrder` boundary. Child stages were **UNKNOWN** before this program and remain **UNKNOWN in production** until samples are collected.

---

## 3. Why Instrumentation Was Required

The forensics program classified the bottleneck as **localized but not measured**. Call-graph inspection showed a sequential chain (membership → often `createOpenCheck` → financial TX with enroll / Charge INSERT / Order Settlement / Charge list ×2 / `computeCheckMoney` / persist / OS recalc). That structure does **not** prove which child spent the 3455 ms.

Without stage clocks, any optimization of Charge inserts, duplicate reads, Order Settlement, or `computeCheckMoney` would be speculation. This program measures first.

---

## 4. Existing `ensureCheckForOrder` Call Graph

Unchanged sequencing:

```
findBlockingMembershipForOrder
  existing open Check:
    getCheckById                          // outside TX; duration lands in unaccounted
    withCheckOwnedTransaction:
      enrollOrderInCheck
        snapshotChargesForEnrolledOrder   // Charge INSERT row-by-row
      ensureOrderSettlementForEnrollment
      refreshOpenCheckMoneyFromDiscovery
        ensureOpenCheckChargeComposition  // Charge list #1
        loadChargesSubtotal               // Charge list #2
        computeCheckMoney                 // in-memory
        updateCheckMoney
      recalculateOrderSettlementsForCheck
      findCheckById
  else:
    createOpenCheck                       // OUTSIDE TX
      restaurant tax/currency snapshot
      seed computeCheckMoney
      insertOperationalCheck
      findCheckById
    withCheckOwnedTransaction:            // same body as existing-open path
      enroll → OS insert → refresh money → OS recalc → findCheckById
```

Settlement Record is **not** on this path. Confirm / `finalizeOpenCheckById` is **not** on this path.

---

## 5. Instrumentation Design

| Choice | Decision |
|---|---|
| Clock | Existing server `Date.now()` / `elapsedSinceMs` (not a new framework; not `console.log`; not browser `performance.now()`) |
| Collector | `EnsureCheckForOrderStageMs` in `ensureCheckForOrderStageMs.ts` |
| TX wall | Reuse `withCheckOwnedTransaction(..., stageMs)` already used by finalize |
| Charge INSERT | `recordChargeInsert` around each existing `insertCheckCharge` (still a `for` loop) |
| Charge snapshot wall | `chargeInsertTiming.createMs` around existing `snapshotChargesForEnrolledOrder` |
| Emission | `opsLog` `check_ensure_for_order`; POS merges the same fields onto `pos_check_intake` |
| Extra DB | None. No probes, no extra Charge/OS/Check reads, no nested transactions |

Additive identity used for **unaccounted** (nested TX stages are **not** added again):

```
ensureTotalMs
  = membershipLookupMs
  + (createOpenCheckMs ?? 0)
  + (txPreparationMs ?? 0)
  + (txWallMs ?? 0)
  + unaccountedMs
```

`enrollMs`, Charge, Order Settlement, Charge lists, `computeCheckMoney`, persist, and reload are **nested inside `txWallMs`** (and `txWriteMs` for the callback). They are reported separately so production can see the inner split without double-counting the total.

---

## 6. Stage Definitions

| Stage | When | Nested in |
|---|---|---|
| `membershipLookupMs` | `findBlockingMembershipForOrder` | total |
| `createOpenCheckMs` | Whole `createOpenCheck` when Check is created; **null** if already existed | total |
| `taxSnapshotMs` | Restaurant snapshot preparation | `createOpenCheckMs` |
| `computeCheckMoneySeedMs` | Seed `computeCheckMoney` before Check INSERT | `createOpenCheckMs` |
| `checkInsertMs` | `insertOperationalCheck` | `createOpenCheckMs` |
| `txPreparationMs` | `getDb()` before `db.transaction` | total |
| `txWallMs` | `db.transaction` wall (BEGIN + writes + COMMIT + driver) | total |
| `txWriteMs` | Callback inside the transaction | `txWallMs` |
| `enrollMs` | `enrollOrderInCheck` (membership + Charge snapshot) | `txWriteMs` |
| `chargeCreateMs` | `snapshotChargesForEnrolledOrder` wall | `enrollMs` |
| `chargeInsertCount` / `chargeInsertMs` / `chargeInsertMaxMs` | Each `insertCheckCharge` | `chargeCreateMs` |
| `orderSettlementInsertMs` | `ensureOrderSettlementForEnrollment` | `txWriteMs` |
| `chargeListEnsureMs` | Charge list #1 (`ensureOpenCheckChargeComposition`) | `txWriteMs` |
| `chargeListSumMs` | Charge list #2 (`loadChargesSubtotal`) | `txWriteMs` |
| `computeCheckMoneyMs` | Persist-path in-memory `computeCheckMoney` | `txWriteMs` |
| `checkMoneyPersistMs` | `updateCheckMoney` | `txWriteMs` |
| `orderSettlementRecalcMs` | `recalculateOrderSettlementsForCheck` | `txWriteMs` |
| `checkReloadMs` | Final `findCheckById` in TX | `txWriteMs` |
| `checkCreated` | `true` if `createOpenCheck` ran | — |
| `unaccountedMs` | `total − membership − createOpenCheck − txPrep − txWall` | total |

`terminalId` is included when POS Check Intake supplies it.

---

## 7. Financial Safety Constraints

| Constraint | Status |
|---|---|
| Transaction boundary | Same `withCheckOwnedTransaction` around enroll + OS insert + money refresh + OS recalc + reload. `createOpenCheck` still **outside** that TX. |
| No nested transactions | Unchanged |
| Charge INSERT | Still row-by-row. Not batched. |
| Charge reads | Still two distinct lists on the persist path. Not collapsed. |
| Order Settlement | Still inside the Check-owned TX. Not moved to a worker. |
| Settlement Record | Not introduced on this path. Not instrumented as if it were. |
| `computeCheckMoney` | Still pure in-memory in `@shared/operational-session`. Not moved. Inputs/outputs unchanged. |
| Confirm / Payment | Unchanged. |
| Authorization / idempotency / concurrency | POS intake fingerprint, exclusive idempotency, and membership blocking unchanged. |
| Extra awaits for timing | None. Clocks wrap existing awaits. |
| Extra DB for timing | None. |
| Browser / React | No Check money or ensure work moved to the client. |

---

## 8. Test Results

Focused Vitest run (84 tests, 12 files): **passed**.

| File | What it proves |
|---|---|
| `ensureCheckForOrderStageMs.test.ts` | Stage timers exist; unaccounted math; optional stages stay `null`; metadata has no financial amounts |
| `CheckService.ensureCheckForOrder.stageTiming.test.ts` | New-Check and existing-Check timings; total identity; TX once; SR not called; financial call order unchanged |
| `ensureCheckForOrder.stageInstrumentation.architecture.guards.test.ts` | No new framework; no timing `getDb`; createOpenCheck outside TX; no batch Charge insert; OS in TX; no SR on ensure path |
| `CheckService.m4.sessionOptionality.test.ts` | Existing sessionless ensure behavior still holds (enroll still on the TX client) |
| `checkChargeComposition.test.ts` | Row-by-row insert count matches timing `count` |
| `checkMembershipService.test.ts` | Optional Charge timing does not change enroll |
| `posCheckIntake.order.test.ts` | `pos_check_intake` carries stage fields without `grandTotal` / `taxAmount` / `subtotal` |
| `posCheckIntake.architecture.guards.test.ts` | Intake still uses `ensureCheckForOrder`; no POS Check table |
| `posPaymentFlowBoundary.architecture.guards.test.ts` | Taxonomy includes `check_ensure_for_order` |
| `CheckService.financialTxnStage.instrumentation.test.ts` | Finalize TX instrumentation unchanged |
| `CheckService.orderSettlementIntegration.test.ts` | OS integration unchanged |
| `cashierPaymentFlowTiming.architecture.guards.test.ts` | Intake still emits duration telemetry via `OPS_EVENT.pos_check_intake` |

No existing tests were deleted. Guards were not weakened.

---

## 9. Production Sample Collection

**Status: INSUFFICIENT-SAMPLES** (`n = 0` live intakes in this implementation environment).

After deploy, collect **at least 10** real Cashier Check Intake successes, preferably **distinct Orders/Checks**.

Query:

```
[OPS][ORDER][info] check_ensure_for_order
[OPS][ORDER][info] pos_check_intake
```

Per sample record:

- `restaurantId`, `orderId`, `checkId`, `terminalId`
- `ensureTotalMs` / `checkEnsureMs`
- `membershipLookupMs`, `createOpenCheckMs`, `taxSnapshotMs`, `checkInsertMs`
- `txPreparationMs`, `txWallMs`, `txWriteMs`
- `enrollMs`, `chargeCreateMs`, `chargeInsertCount`, `chargeInsertMs`, `chargeInsertMaxMs`
- `orderSettlementInsertMs`, `chargeListEnsureMs`, `chargeListSumMs`
- `computeCheckMoneyMs`, `checkMoneyPersistMs`
- `orderSettlementRecalcMs`, `checkReloadMs`
- `checkCreated`, `unaccountedMs`

Do not refund, reverse collections, or manufacture latency. Prefer different transactions over repeating one Check.

---

## 10. Stage Timing Analysis

Production inner-stage timings: **not available** (`n = 0`).

Required percentiles for `ensureCheckForOrder` total, `createOpenCheck`, financial transaction, Charge creation, Charge reads, Order Settlement, `computeCheckMoney`, Check persistence, and unaccounted:

| Metric | min | p50 | p90 | max |
|---|---|---|---|---|
| All listed stages | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

The 3455 ms figure is a **single** prior boundary sample. It is **not** a p50/p90 of inner stages. Do not declare an optimization target from it.

---

## 11. Measured vs Unknown

### MEASURED (code + tests)

- Stage collector and OPS event fields exist.
- Additive identity `total = membership + createOpenCheck + txPrep + txWall + unaccounted`.
- Optional stages are `null` when the Check already existed (`createOpenCheckMs`, tax snapshot, Check INSERT, seed compute).
- Charge INSERT count / sum / max are recorded without batching.
- Charge list #1 and #2 are timed separately.
- `computeCheckMoney` persist-path duration is timed in place.
- TX preparation, write, and wall are timed with the existing Check-owned transaction helper.

### OBSERVED (production, prior program)

- One intake: `checkEnsureMs = 3455` at 2026-08-19 18:33:31Z (order 6990033, check 1650058).
- Intake envelope: `durationMs = 4148`, `authMs = 595`, `orderLoadMs = 98`.

### UNKNOWN

- Every inner stage in **production** (no post-instrumentation samples).
- Exact **lock wait** vs write vs **COMMIT** (`txWallMs − txWriteMs` includes commit/driver; lock wait during statements is inside `txWriteMs` and is **not** separately exposed). Classification: **UNKNOWN — NOT INSTRUMENTED**.
- Per-row Charge INSERT array (aggregates only: count / sum / max).
- `getOrderById` / `getOrderItemsByOrderId` inside Charge snapshot (nested in `chargeCreateMs`; those DB helpers still use `getDb()`, not the Check TX client — **not changed**, not separately clocked).
- `getCheckById` on the existing-membership path (outside TX; in **unaccounted**).
- `createOpenCheck` post-insert `findCheckById` (nested in `createOpenCheckMs`, not a named stage).

---

## 12. Optimization Candidates

No P0/P1 optimization was implemented.

| Stage | Class | Reason |
|---|---|---|
| Membership lookup | UNKNOWN | No production inner samples |
| `createOpenCheck` / tax snapshot / Check INSERT | UNKNOWN | Same |
| TX wall / write / prep | UNKNOWN | Same. Lock wait specifically UNKNOWN — NOT INSTRUMENTED |
| Charge creation / row-by-row INSERT | UNKNOWN | Call graph still shows N inserts; cost unmeasured |
| Charge list #1 / #2 | UNKNOWN | Duplicate reads still present; cost unmeasured |
| `computeCheckMoney` | UNKNOWN | Pure in-memory; duration unmeasured in production |
| Check money persist | UNKNOWN | Same |
| Order Settlement insert / recalc | UNKNOWN | Same. Moving OS is P2 / REQUIRES NEW ADR |
| Unaccounted | UNKNOWN | Same |
| Settlement Record | P3 / not on path | Do not introduce or optimize here |

Call-graph observations from forensics (duplicate Charge reads, row-by-row INSERT, OS in TX) remain **hypotheses**, not measured P0/P1.

---

## 13. ADR Impact Assessment

Nothing in this program requires or writes an ADR.

Any **future** proposal involving the following is **REQUIRES NEW ADR** and must **not** be implemented as a silent follow-on:

- moving Order Settlement off this TX (ADR-ARCH-022 / I-OS-07)
- moving Settlement Record onto or off Confirm TX
- changing financial transaction boundaries
- changing Check or Payment ownership
- moving `computeCheckMoney` to the browser or another process
- changing Charge snapshot semantics
- changing financial commit semantics

---

## 14. Final Classification

**PASS WITH INSUFFICIENT-SAMPLES**

- Internal `ensureCheckForOrder` stages are observable in code and tests.
- Financial behavior, TX boundary, Charge insert style, duplicate Charge reads, and OS placement are unchanged.
- No additional DB work was introduced for timing.
- Production **can** emit structured stage timing (`check_ensure_for_order` + extended `pos_check_intake`).
- Fewer than 10 production samples exist in this environment, so inner-stage latency analysis is **INSUFFICIENT-SAMPLES**.

---

## 15. Recommended Next Program

**PAYMENT-READINESS-CHECK-ENSURE-STAGE-SAMPLES-1**

Deploy this instrumentation. Collect ≥10 real Cashier Check Intake events across distinct Orders. Compute min / p50 / p90 / max per stage. Only then open a **controlled** optimization program for a stage that is actually dominant.

Do not start Charge batching, Charge-read collapse, OS relocation, or `computeCheckMoney` moves from the 3455 ms blob.

---

## 16. Explicit statement

NO FINANCIAL SEMANTICS CHANGED.

NO FINANCIAL AUTHORITY MOVED.

NO PRODUCTION OPTIMIZATION IMPLEMENTED.

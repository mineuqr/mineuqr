# SETTLEMENT-RECORD-CONCURRENCY-VALIDATION-1

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-RECORD-CONCURRENCY-VALIDATION-1 |
| **Phase** | Post-Implementation Validation |
| **Date** | 2026-07-23 |
| **References** | ADR-ARCH-026 · SETTLEMENT-RECORD-IMPLEMENTATION-1 |
| **Automated suite** | `server/operational-session/check/__tests__/CheckService.settlementRecordConcurrency.test.ts` |
| **Architecture changes** | **None** (defect documented; not silently fixed) |
| **Verdict** | **CONCURRENCY FAILURE** (at validation time) |
| **Remediation** | Resolved by [SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1](../SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1/HOTFIX.md) — **HOTFIX CERTIFIED** |

> Historical report: documents the defect as discovered. Post-hotfix certification lives in the hotfix program and the updated concurrency suite gates.

---

## Test Design

### How concurrency was generated

Two independent calls to `settleCheckPaidByIdDetailed({ restaurantId: 1, checkId: 100 })` were launched with `Promise.allSettled` (no serialization).

Collision probability was maximized with production-faithful barriers (not locks):

1. **Pre-TX barrier** — both requests observe Check `outcome=open` before either mutates.  
2. **TX barrier** — both enter `withCheckOwnedTransaction` before either proceeds.  
3. **Finalize barrier** — both reach `finalizeCheckOutcome` while the Check is still open for the first writer.

No artificial locking beyond production implementation was introduced.

### Production semantics mirrored in the harness

| Operation | Production behavior mirrored |
|-----------|------------------------------|
| `finalizeCheckOutcome` | `UPDATE … WHERE outcome='open'` — **does not throw / abort when 0 rows affected** (`checkRepository.ts`) |
| `insertSettlementTransactions` | Append lines — **no uniqueness for one settle set** |
| Order Settlement apply | Terminal CAS → `already_in_state` on loser |
| Settlement Record insert | UNIQUE `(restaurantId, checkId, recordKind, recordGeneration)` → `DUPLICATE` → `already_applied` |
| TX rollback | Snapshot/restore on thrown errors (atomicity model) |

This is a deterministic concurrency model of the **current** finalize path. It does not invent locks the production code lacks.

### Additional cases

| Case | Purpose |
|------|---------|
| Settlement Record concurrent insert alone | Proves SR unique key + `already_applied` holds in isolation |
| SR repository failure injection | Proves TX rollback leaves **zero** committed Settlement Records |
| Domain identity uniqueness | Proves SR-INV-05 in pure domain without persistence |

---

## Execution Environment

| Item | Value |
|------|-------|
| Runtime | Node.js + Vitest 2.1.9 |
| Host OS | Windows 10 (win32) |
| Suite | `npx vitest run server/operational-session/check/__tests__/CheckService.settlementRecordConcurrency.test.ts` |
| Result | **4 passed · 1 failed** (CERTIFICATION GATE intentionally red) |
| DB | Concurrent financial store modeling production repository contracts (no live TiDB required for race determinism) |

---

## Timeline

Observed concurrent execution sequence (from `CONCURRENCY_EVIDENCE_JSON`):

| t | Actor | Step | Detail |
|---|-------|------|--------|
| 1–2 | pre-tx | `pre_tx_read_open` | Both see `open` |
| 3–4 | tx-1, tx-2 | `tx_entered` | Both inside Check-owned TX |
| 5–6 | tx-1, tx-2 | `finalize_gate` | Synchronized at finalize |
| 7 | tx-1 | `finalize_applied` | `paid` |
| 8 | tx-2 | `finalize_noop` | `already=paid` (**continues**) |
| 9 | tx-1 | `st_insert` | batch=1 |
| 10 | tx-2 | `st_insert` | batch=2 **duplicate tender set** |
| 11 | tx-1 | `os_applied` | first OS terminal transition |
| 12 | tx-2 | `os_already_in_state` | OS protected |
| 13 | tx-1 | `sr_insert` | `sr:1:100:settlement:1` |
| 14 | tx-2 | `sr_duplicate` | unique constraint path |
| 15–16 | tx-1, tx-2 | `tx_commit` | **both commit** |

---

## Results

### Criteria matrix (ADR / program success criteria)

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Exactly one Check finalization | **PASS** | `finalizeOutcomeApplied=1`, `finalizeOutcomeNoops=1` |
| Check terminal once | **PASS** | `outcome=paid` |
| Exactly one Settlement Record | **PASS** | `settlementRecords=1`, id `sr:1:100:settlement:1` |
| SR matches Check freeze | **PASS** | `grandTotal=20.00`, `outcome=paid` |
| Exactly one Order Settlement transition | **PASS** | `orderSettlementAppliedTransitions=1` |
| Exactly one Settlement Transaction set | **FAIL** | `settlementTxBatches=2`, `settlementTxLines=2` |
| Exactly one `SettlementRecordCreated` | **PASS** | events array length 1 (loser `already_applied` emits none) |
| No duplicate successful finalize commits | **FAIL** | `fulfilled=2`, `committedTx=2` |
| No orphan Settlement Record | **PASS** | paid Check has exactly one SR |
| Atomicity on SR repository failure | **PASS** | injected failure → rollback → `settlementRecords=0` |
| SR-only concurrent idempotency | **PASS** | `applied=1` + `already_applied=1`, one row |

### Observed behavior summary

Settlement Record publication under race is **correct in isolation** (unique constraint + `already_applied`).

The **Check finalize pipeline as a whole is not concurrency-safe**: after a no-op `finalizeCheckOutcome`, the loser still inserts Settlement Transactions and commits a successful finalize response.

---

## Database Evidence

### Before

```json
{ "outcome": "open", "stLines": 0, "srCount": 0, "osStatus": "pending" }
```

### After (concurrent race)

```json
{
  "outcome": "paid",
  "finalizeOutcomeApplied": 1,
  "finalizeOutcomeNoops": 1,
  "settlementTxBatches": 2,
  "settlementTxLines": 2,
  "orderSettlementAppliedTransitions": 1,
  "settlementRecords": 1,
  "committedTx": 2,
  "fulfilled": 2
}
```

### Integrity notes

| Concern | Finding |
|---------|---------|
| Unique constraints | Settlement Record business unique key **holds** |
| Foreign keys | Not used on ST/OS/SR tables (platform pattern); N/A |
| Append-only SR | No UPDATE path exercised; loser cannot mutate winner SR |
| Partial commits on SR failure | Rollback restores store; no orphan SR |
| Partial financial artifacts on race win/lose | **Duplicate ST lines remain after both commits** |

### Equivalent verification queries (production)

```sql
-- Expect 1 after single settle; race currently yields 2 ST rows
SELECT COUNT(*) FROM check_settlement_transactions
WHERE restaurantId = ? AND checkId = ?;

-- Expect 1
SELECT COUNT(*) FROM settlement_records
WHERE restaurantId = ? AND checkId = ?
  AND recordKind = 'settlement' AND recordGeneration = 1;

-- Expect paid once
SELECT outcome FROM operational_checks
WHERE restaurantId = ? AND id = ?;
```

---

## Event Evidence

| Event | Count under race | Notes |
|-------|------------------|-------|
| `SettlementRecordCreated` | **1** | Winner only; loser `already_applied` returns `events: []` |
| Duplicate SR domain events | **0** | Replay-safe claim key design holds for SR |
| Integration outbox | N/A | v1 collects facts; no bus publish |

Settlement Record event idempotency is intact. The failure mode is **not** duplicate SR events; it is duplicate tender persistence + dual successful commits.

---

## Idempotency Verification

| Layer | Behavior under retry / race |
|-------|-----------------------------|
| Settlement Record | **Idempotent** — unique key + `already_applied` |
| Order Settlement | **Idempotent** — terminal `already_in_state` |
| Check outcome transition | **Single apply** — WHERE `open` |
| Settlement Transactions | **Not idempotent** — second finalize appends another tender set |
| API result | Loser still **fulfills** with a “successful” financial result (SR `already_applied` nested), so callers are not forced into safe failure |

Repeated finalize after completion (sequential) is still gated by pre-TX `outcome !== open` → `CheckTransitionError`. The hole is specifically the **overlapping open-read / overlapping TX** window.

---

## Root Cause (architectural defect)

### Race condition

Concurrent finalize on the same open Check.

### Affected component

`finalizeOpenCheckById` / `finalizeCheckOutcome` integration boundary  
(`server/operational-session/check/CheckService.ts`, `checkRepository.ts`)

### Root cause

1. Pre-TX gate allows both requests to proceed while both read `open`.  
2. `finalizeCheckOutcome` applies conditional UPDATE but **ignores affected-row count** and never aborts the TX on noop.  
3. Downstream steps (`insertSettlementTransactions`, OS apply, SR create) still execute for the loser.  
4. SR unique constraint prevents a second Settlement Record, but **does not roll back** the loser’s already-inserted Settlement Transactions.  
5. Both transactions commit.

### Recommended remediation (do not implement in this program)

1. Make `finalizeCheckOutcome` return affected rows; if `0`, **abort** the finalize TX with an approved idempotent outcome (`already_applied` / conflict), **before** ST insert.  
2. Optionally add settle-generation uniqueness for Settlement Transactions (or delete-on-abort is unnecessary if step 1 is correct).  
3. Re-run this certification gate until `failedCriteria = []`.

---

## Conclusion

Settlement Record’s own concurrency controls satisfy ADR-ARCH-026 SR-INV-05 under race.

The **financial finalization path as a whole does not** satisfy the program’s concurrent success criteria, because Settlement Transaction sets and successful finalize commits are duplicated when a losing finalize continues after a no-op Check outcome update.

Architecture / schema / domain were **not** modified (per program constraints).

---

# CONCURRENCY FAILURE

| Failed criteria | Evidence |
|-----------------|----------|
| Exactly one Settlement Transaction set | `settlementTxBatches=2` |
| No duplicate successful finalize commits | `fulfilled=2`, `committedTx=2` |

**Race:** concurrent `settleCheckPaidByIdDetailed` on the same Check.  
**Component:** Check finalize TX continues after no-op `finalizeCheckOutcome`.  
**Remediation:** abort finalize when outcome CAS/UPDATE affects 0 rows; then re-certify with this suite’s CERTIFICATION GATE.

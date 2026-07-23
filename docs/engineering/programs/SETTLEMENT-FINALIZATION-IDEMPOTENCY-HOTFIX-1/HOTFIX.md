# SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 |
| **Phase** | Production Hotfix (P0 – Financial Integrity) |
| **Date** | 2026-07-23 |
| **References** | ADR-ARCH-026 · SETTLEMENT-RECORD-IMPLEMENTATION-1 · SETTLEMENT-RECORD-CONCURRENCY-VALIDATION-1 |
| **Prior verdict** | CONCURRENCY FAILURE (duplicate Settlement Transaction commits) |
| **Verdict** | **HOTFIX CERTIFIED** |

---

## Root Cause Analysis

Concurrent finalize on the same open Check:

1. Both threads pass the pre-TX `outcome === "open"` gate.  
2. Thread A’s `UPDATE … WHERE outcome='open'` affects **1** row.  
3. Thread B’s identical UPDATE affects **0** rows.  
4. **Before hotfix:** Thread B ignored the 0-row result and continued into Settlement Transactions → OS → Settlement Record → **commit**.  
5. Settlement Record uniqueness prevented a second SR, but **duplicate Settlement Transaction batches** remained.

Root cause: **loss of Check finalization ownership did not terminate the transaction** before irreversible financial side effects.

---

## Files Changed

| File | Change |
|------|--------|
| `server/operational-session/check/checkRepository.ts` | `finalizeCheckOutcome` returns `affectedRows` |
| `server/operational-session/check/CheckService.ts` | Abort with `CheckTransitionError` when `ownedRows === 0` **before** ST/OS/SR |
| `server/operational-session/check/__tests__/CheckService.settlementRecordConcurrency.test.ts` | Permanent gates: 2/5/10 concurrent, retry, rollback |
| CheckService m3/m4/OS integration tests | Mock `finalizeCheckOutcome` → `1` |
| `docs/engineering/programs/SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1/HOTFIX.md` | This report |

**Not changed:** ADR-ARCH-026, Settlement Record domain/schema, Reporting, Aggregates, locks/mutexes.

---

## Logic Changes

```ts
const ownedRows = await finalizeCheckOutcome(..., tx);
if (ownedRows === 0) {
  const current = await findCheckById(check.id, tx);
  throw new CheckTransitionError(
    `Cannot finalize check from outcome ${current?.outcome ?? "unknown"}`
  );
}
// only then: insertSettlementTransactions / OS / Settlement Record
```

Idempotent response reuses the existing `CheckTransitionError` contract (same as the pre-TX non-open gate). No new response shapes.

---

## Transaction Flow Before

```
TX B: finalize UPDATE → 0 rows → ST insert → OS → SR attempt → COMMIT  ✗
```

## Transaction Flow After

```
TX A: finalize UPDATE → 1 row → ST → OS → SR → COMMIT  ✓
TX B: finalize UPDATE → 0 rows → CheckTransitionError → ROLLBACK  ✓
      (no ST, no OS mutation, no SR, no events)
```

---

## Concurrency Results

| Scenario | Fulfilled | Rejected | ST batches | SR | OS transitions | `SettlementRecordCreated` |
|----------|-----------|----------|------------|----|----------------|---------------------------|
| 2 concurrent | 1 | 1 | 1 | 1 | 1 | 1 |
| 5 concurrent | 1 | 4 | 1 | 1 | 1 | 1 |
| 10 concurrent | 1 | 9 | 1 | 1 | 1 | 1 |
| Retry after success | 0 (throws) | — | still 1 | still 1 | still 1 | unchanged |
| SR insert failure | 0 | rollback | 0 | 0 | restored open | 0 |

Losers reject with `CheckTransitionError` — not a successful financial execution.

---

## Regression Tests

Permanent suite:

`server/operational-session/check/__tests__/CheckService.settlementRecordConcurrency.test.ts`

| Gate | Status |
|------|--------|
| CERTIFICATION: 2 concurrent | **PASS** |
| CERTIFICATION: 5 concurrent | **PASS** |
| CERTIFICATION: 10 concurrent | **PASS** |
| CERTIFICATION: retry after completion | **PASS** |
| CERTIFICATION: SR failure rollback | **PASS** |

Also green: CheckService m3/m4/OS integration regressions.

---

## Validation Evidence

Command:

```bash
npx vitest run server/operational-session/check/__tests__/CheckService.settlementRecordConcurrency.test.ts
```

Result: **7/7 passed**; `failedCriteria: []` for concurrency 2/5/10.

Example timeline (N=2):

1. Both pre-TX read `open`  
2. Both enter TX + finalize gate  
3. tx-1 `finalize_applied`  
4. tx-2 `finalize_noop` → `tx_rollback` (`CheckTransitionError`)  
5. tx-1 ST → OS → SR → `tx_commit`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Driver omits `affectedRows` | Same pattern as OS/SP/MCA CAS updates; returns `0` → safe abort |
| Callers treating concurrent loser as hard failure | Same as already-finalized Check (`CheckTransitionError`) — existing contract |
| Non-concurrent happy path | Unchanged when UPDATE affects 1 row |

---

## Final Certification

All success criteria met:

- Exactly one Check finalization  
- Exactly one Settlement Transaction batch  
- Exactly one Settlement Record  
- Exactly one Order Settlement transition  
- Exactly one `SettlementRecordCreated`  
- Exactly one successful financial commit  
- Losers terminate with zero financial side effects  
- All concurrency certification gates pass  
- Non-concurrent finalize path unchanged when ownership is held  

---

# HOTFIX CERTIFIED

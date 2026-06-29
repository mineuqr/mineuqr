# TEST-INFRA-SESSION-1 — Failure Reproduction

**Program:** TEST-INFRA-SESSION-1  
**Date:** 2026-06-29  
**Target:** `server/_core/sessionRevocation.test.ts`

---

## Reproduction Protocol

1. Run full Vitest suite in parallel (default `npm test`)
2. Run `sessionRevocation.test.ts` in isolation (`npx vitest run server/_core/sessionRevocation.test.ts`)
3. Compare failure mode, duration, and error message

---

## Parallel Execution — FAIL (Pre-Fix)

**Command:** `npm test` (five consecutive runs, pre-fix baseline)

| Run | Result | `sessionRevocation` duration | Error |
|-----|--------|------------------------------|-------|
| 1 | FAIL | 5027ms | Test timed out in 5000ms |
| 2 | PASS | 4317ms | — |
| 3 | FAIL | 5019ms | Test timed out in 5000ms |
| 4 | FAIL | 5075ms | Test timed out in 5000ms |
| 5 | FAIL | 5026ms | Test timed out in 5000ms |

**Failure rate:** 4/5 (80%)  
**Failure signature:** Always `Error: Test timed out in 5000ms` — not assertion mismatch

---

## Isolated Execution — PASS (Pre-Fix)

**Command:** `npx vitest run server/_core/sessionRevocation.test.ts` (three runs)

| Run | Test duration |
|-----|---------------|
| 1 | 701ms |
| 2 | 697ms |
| 3 | 805ms |

**Result:** 3/3 PASS — logic correct; instability is parallel-load only

---

## Post-Fix Parallel Validation

**Command:** `npm test` (five consecutive runs, post-fix)

| Run | Result | `sessionRevocation` duration |
|-----|--------|------------------------------|
| 1 | PASS | 48ms |
| 2 | PASS | 44ms |
| 3 | PASS | 32ms |
| 4 | PASS | 42ms |
| 5 | PASS | (included in full suite PASS) |

**Failure rate:** 0/5 (0%)

---

## Conclusion

The failure is **reproducible under parallel full-suite execution** and **not reproducible in isolation** (pre-fix). The failure is a **timeout at Vitest's default 5000ms boundary**, not a logic regression.

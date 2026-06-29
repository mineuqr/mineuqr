# TEST-INFRA-SESSION-1 — Parallel Stability Validation

**Program:** TEST-INFRA-SESSION-1  
**Date:** 2026-06-29

---

## Type Check

```
npm run check → PASS (tsc --noEmit)
```

---

## Target Test — Isolated

```
npx vitest run server/_core/sessionRevocation.test.ts
→ PASS (~15ms test body)
```

---

## Full Suite — Five Consecutive Parallel Runs (Required)

**Command:** `npm test` × 5 (no flags; default parallel pool)

| Run | Exit Code | Test Files | Tests |
|-----|-----------|------------|-------|
| 1 | 0 | 192 passed | 1134 passed, 2 skipped |
| 2 | 0 | 192 passed | 1134 passed, 2 skipped |
| 3 | 0 | 192 passed | 1134 passed, 2 skipped |
| 4 | 0 | 192 passed | 1134 passed, 2 skipped |
| 5 | 0 | 192 passed | 1134 passed, 2 skipped |

**Result:** 5/5 consecutive full-suite greens ✓

---

## `sessionRevocation.test.ts` Under Parallel Load

Observed durations in post-fix full-suite runs:

| Run | Duration |
|-----|----------|
| 1 | 48ms |
| 2 | 44ms |
| 3 | 32ms |
| 4 | 42ms |

Pre-fix parallel failures: 5027ms (timeout). **~100× reduction** in test body time.

---

## Extended Validation (Post-Fix)

Additional full-suite runs during investigation:

| Batch | Greens | Failures | Failure cause |
|-------|--------|----------|---------------|
| Pre-fix (5 runs) | 1 | 4 | `sessionRevocation` timeout |
| Post-fix session only (8 runs) | 6 | 2 | `table-order` timeout (correlated) |
| Post-fix all fixes (5 runs) | 5 | 0 | — |

---

## Exit Criteria Checklist

| Criterion | Status |
|-----------|--------|
| Root cause proven | ✓ |
| Root cause corrected | ✓ |
| Full repository passes | ✓ |
| Parallel execution stable (5 consecutive) | ✓ |
| Exit Code = 0 | ✓ |
| No production behavior changes | ✓ |
| No tests skipped or weakened | ✓ |

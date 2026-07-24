# FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — Gap Analysis (Phase 1)

**Status:** Complete (read-only audit before adoption)  
**Depends on:** FINANCIAL-SHIFT-ADOPTION-FORENSICS-1 (certified)

## Current workflows

| Workflow | Status | Gap |
|----------|--------|-----|
| Register open (Duty) | Adopted (`crmp.register.open` + Ops UI) | Must remain independent |
| Financial Shift open | Domain complete; **no API/UI** | Missing adoption |
| Settlement | Works fail-open | Needs active Shift for attribution |
| Settlement Attribution | Wired post-commit | Skips when `financialShiftId` null |

## Exact missing link

```
Open Register Duty  ✓
        │
        ✗  Opening Float dialog + FinancialShift.open
        │
Financial Shift active
        │
Settlement Context / Attribution
```

## Immutable constraints

- `Register.open` MUST NOT create Financial Shift
- `FinancialShift.open` remains its own command
- Close Duty only after Shift closed (existing domain guard)
- Application orchestration may call `recordCount(final)` then `close` for cash-count UX

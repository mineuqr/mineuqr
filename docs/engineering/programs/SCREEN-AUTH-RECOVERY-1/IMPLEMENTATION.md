# SCREEN-AUTH-RECOVERY-1

**Classification:** Production Incident Recovery  
**Status:** Complete  
**Forensics baseline:** SCREEN-AUTH-401-FORENSICS-1

## Summary

Minimal client fix: device auth failures on `runtime.getStatus` now invoke the existing `handleRevoked()` flow even when no status payload is returned, eliminating infinite loading on stale credentials.

## Files

| File | Change |
|------|--------|
| `useRuntimeOrchestrator.ts` | Dedicated auth-recovery effect; bootstrap/reconciliation defer on query error |
| `authRecovery.guards.test.ts` | **New** — recovery ordering and no-bypass guards |

## Validation

`pnpm build` · relevant vitest suites

# TEST-INFRA-ORDER-1A — Fix Incorrect Test Import

**Program:** TEST-INFRA-ORDER-1A  
**Date:** 2026-06-29  
**Reference:** `docs/investigations/false-ts2307-investigation.md`

---

## Change

**File:** `server/order/read/infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts`

| | Import |
|---|--------|
| **Before** | `../../../infrastructure/events/EventEnvelope` |
| **Resolved to** | `server/order/read/infrastructure/events/EventEnvelope` (missing) |
| **After** | `../../../../infrastructure/events/EventEnvelope` |
| **Resolved to** | `server/order/infrastructure/events/EventEnvelope` (canonical) |

Type-only import; no runtime behavior change.

---

## Validation

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `npx vitest run` | PASS — 188 files, 1123 tests, exit 0 |
| Direct `tsc` on test file — `EventEnvelope` ts2307 | **Absent** (no EventEnvelope error in output) |
| Production files changed | **None** |
| Cursor `ts(2307)` on this import | **Should clear** after TS server rechecks file (import now matches sibling `CompositeEventDispatchDelegate.test.ts`) |

---

## Git Diff Summary

```
1 file changed, 1 insertion(+), 1 deletion(-)
server/order/read/infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts
```

Single-line import path correction only.

---

## Production Impact

**None.** No production, event infrastructure, or read architecture files modified. Assertions and test logic unchanged.

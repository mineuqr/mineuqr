# OPERATIONAL-BUGFIX-1C — Runtime Failure Visibility (F-005 / F-008 / F-017)

**Classification:** Product Readiness  
**Priority:** High  
**Status:** COMPLETE — awaiting certification

## Root Cause

Device runtime **hid operational failures** at three layers:

| ID | Failure | Root cause |
|----|---------|------------|
| **F-005** | Kitchen queue errors invisible | `useKitchenRuntimeStream` ignored `queueQuery.isError`; `KitchenScreenPanel` showed empty columns or loading only; `placeholderData` kept stale queue without indication |
| **F-008** | DB unavailable = empty kitchen | `DrizzleOrderReadQueryAdapter.listPipelineOrders()` returned `[]` when `getDb()` was null — indistinguishable from empty restaurant |
| **F-017** | Runtime errors never shown | `OperationalScreenStateAggregator` collected `lastError` into `state.errors`, but no production component rendered `errors` (DEV diagnostics only) |

Operators could see **"No orders"** or a normal queue while the system was failing.

## Architecture Compliance

| Constraint | Compliance |
|------------|------------|
| No architecture changes | ✓ Extended stream contract + presentation; state model unchanged |
| No runtime redesign | ✓ Orchestrator, capability negotiation, aggregator untouched |
| No capability negotiation changes | ✓ Untouched |
| No unrelated refactoring | ✓ Scoped to kitchen stream + error presentation |
| Certified patterns preserved | ✓ Filtering stays in runtime layer; presentation consumes stream only |

## Implementation Summary

### F-005 — Kitchen queue failure visibility

- **`buildKitchenRuntimeStream.ts`** — pure builder exposing `isError`, `isShowingStaleData`, `failureKind`, `operatorMessage`
- **`kitchenQueueFailure.ts`** — classifies failures; operator-safe bilingual messages
- **`useKitchenRuntimeStream.ts`** — wires query state through builder; exposes `retry` / `isRefetching`
- **`KitchenScreenPanel.tsx`** — error panel when `isError && !queue`; stale banner when `isShowingStaleData`; **"No orders" only when `!isError`**
- **`KitchenQueueOperationalBanner.tsx`** — error panel + stale data banner components

### F-008 — Database unavailable

- **`kitchenReadErrorCodes.ts`** — `database_unavailable` constant
- **`OrderReadQueryAdapter.ts`** — throws instead of returning `[]` when DB unavailable
- Client classifies and shows explicit **"Order data is temporarily unavailable"** message

### F-017 — Runtime errors in production UI

- **`runtimeOperatorMessages.ts`** — maps `state.errors` / `lastError` to operator-safe text (no stack traces or internal codes)
- **`RuntimeOperationalAlert.tsx`** — renders canonical `screenState.errors` in production
- **`RuntimeRoleHost.tsx`** — mounts alert above role presentation

`placeholderData` is **retained** for degraded UX but paired with `isShowingStaleData` + stale banner so cached queue is never presented as current.

### Files changed

| File | Change |
|------|--------|
| `server/kitchen/read/domain/kitchenReadErrorCodes.ts` | **New** |
| `server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts` | Throw on DB unavailable |
| `client/.../kitchen/buildKitchenRuntimeStream.ts` | **New** stream builder |
| `client/.../kitchen/kitchenQueueFailure.ts` | **New** classification + messages |
| `client/.../kitchen/useKitchenRuntimeStream.ts` | Error/stale exposure |
| `client/.../runtimeOperatorMessages.ts` | **New** operator message mapping |
| `client/.../KitchenScreenPanel.tsx` | Error / stale / empty states |
| `client/.../KitchenQueueOperationalBanner.tsx` | **New** UI components |
| `client/.../RuntimeOperationalAlert.tsx` | **New** runtime error alert |
| `client/.../RuntimeRoleHost.tsx` | Mount operational alert |
| Tests + architecture guards | See below |

## Runtime Behavior Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Queue tRPC failure (no cache) | Empty kitchen / loading | Error panel + retry |
| Queue failure with cached data | Silent stale queue | Stale banner + last known tickets |
| DB unavailable | Empty kitchen | Explicit unavailable message |
| Heartbeat/status failure | `lastError` in DEV diagnostics only | `RuntimeOperationalAlert` in production |
| True empty kitchen | "No orders" | "No orders" (only when `!isError`) |
| Recovery after error | Unclear | Error clears; normal queue returns |

## Validation Results

| Requirement | Result |
|-------------|--------|
| Queue failures show operational error | ✓ |
| DB unavailable never shows "No orders" | ✓ |
| Runtime errors visible to operators | ✓ |
| Last known data clearly identified | ✓ |
| Recovery clears error state | ✓ (query + orchestrator `lastError` clear) |
| Kitchen architecture compliant | ✓ Guards pass |
| State model unchanged | ✓ |
| Capability negotiation unchanged | ✓ |

## Regression Test Results

```
client/.../kitchen/__tests__/kitchenQueueFailure.test.ts           5 tests
client/.../kitchen/__tests__/buildKitchenRuntimeStream.test.ts     5 tests
client/.../__tests__/runtimeOperatorMessages.test.ts               4 tests
server/kitchen/read/__tests__/OrderReadQueryAdapter.test.ts        1 test
architecture guards (client + kitchen)                             updated

Total scoped: 50 tests — ALL PASSED
tsc --noEmit: PASS
```

## Operational Impact

Operators can now distinguish **empty kitchen**, **loading**, **fetch failure**, **database unavailable**, **degraded/stale data**, and **runtime connection errors** — eliminating false confidence from silent failures.

## Production Acceptance

| Criterion | Status |
|-----------|--------|
| No silent queue failures | ✓ |
| DB unavailability explicit | ✓ |
| Production runtime error surfacing | ✓ |
| Stale data labeled | ✓ |
| Tests + guards pass | ✓ |

**Certification:** Awaiting program owner acceptance before the next bug-fix program.

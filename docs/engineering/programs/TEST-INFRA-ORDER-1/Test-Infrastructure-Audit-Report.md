# TEST-INFRA-ORDER-1 — Test Infrastructure Audit Report

**Program:** TEST-INFRA-ORDER-1 — Test Infrastructure Alignment  
**Date:** 2026-06-29  
**Verdict:** PASS

---

## Initial State

| Check | Status |
|-------|--------|
| `npm run check` | PASS |
| `server/order/read` tests | PASS (15/15) |
| Full Vitest suite | FAIL — 21 collection failures |
| Individual tests in failed suites | Not executed (esbuild transform error at import) |

---

## Root Cause

`OrderInfrastructureAdapters.ts` binds `generateOrderNumber` from `server/db.ts`:

```typescript
export const orderNumberAdapter: OrderNumberPort = {
  allocate: generateOrderNumber,
};
```

Tests that import `appRouter` transitively load `placeOrderComposition` → `OrderInfrastructureAdapters`. Vitest hoists `vi.mock("./db")` factories that export only a subset of `db` functions. When `generateOrderNumber` is absent from the mock object, Vitest throws at collection time:

```
No "generateOrderNumber" export is defined on the "./db" mock
```

---

## Affected Surface

21 test files importing `appRouter` with static partial `db` mocks:

- 15 files under `server/`
- 6 files under `server/commercial/`

No production code defect. No read-architecture regression. No event pipeline change.

---

## Circular Dependency Constraint

An initial fix attempt used `importOriginal` to spread all `db` exports into mocks. This **failed** for platform-account tests because:

```
db.ts → imports platformAccount.ts
platformAccount.ts → imports getUserById from db.ts
```

Spreading the actual `db` module during mock factory execution breaks mock isolation for `getUserById` in platform protection tests (13 assertion failures).

**Conclusion:** `db` mocks must remain explicit partial stubs; only missing router-chain exports should be added.

---

## Remediation Applied

1. Added `generateOrderNumber: vi.fn(async () => "ORD-MOCK-001")` to all 21 affected `vi.mock` blocks.
2. Introduced `server/testing/routerDbMock.ts` — shared export for future router-importing tests.
3. Documented `server/testing/partialDbMock.ts` as deprecated for `db.ts` (circular import hazard).
4. Added `scripts/align-db-mocks.mjs` — idempotent alignment script for the 21-file set.

---

## Final State

| Check | Status |
|-------|--------|
| `npm run check` | PASS |
| Full Vitest suite | PASS — 188 files, 1123 tests |
| Collection failures | 0 |
| Exit code | 0 |

---

## Production Impact

**None.** Test-only changes.

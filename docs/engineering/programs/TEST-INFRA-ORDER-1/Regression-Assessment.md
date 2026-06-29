# TEST-INFRA-ORDER-1 — Regression Assessment

**Program:** TEST-INFRA-ORDER-1  
**Date:** 2026-06-29  
**Verdict:** NO PRODUCTION REGRESSION

---

## Production Code

| Area | Modified? | Risk |
|------|-----------|------|
| `server/db.ts` | No | None |
| `server/order/**` (domain, events, read) | No | None |
| `server/routers.ts` | No | None |
| `client/**` | No | None |
| Event pipeline | No | None |
| Read architecture (ORDERS-READ-MODEL-1) | No | None |

---

## Test Behavior Changes

| Change | Effect |
|--------|--------|
| 21 suites unblocked | +203 tests now execute (1123 vs 920 runnable before) |
| Platform protection tests | Still PASS — static mocks preserved |
| Order router tests | Unchanged (already had `generateOrderNumber`) |
| Assertions | Unchanged — no weakened expectations |

---

## Risk Items Investigated

### `importOriginal` on `db` (rejected)

Spreading actual `db` exports caused 13 platform-account assertion failures. Reverted. Documented as anti-pattern for `db` mocks.

### Mock stub semantics

`generateOrderNumber` stub returns `"ORD-MOCK-001"` and is never asserted in affected suites. No test behavior depends on order number format in these files.

---

## Backward Compatibility

- Existing test patterns (`vi.fn()` overrides, `beforeEach` mock setup) unchanged.
- Tests that already used `importOriginal` for `db` unaffected.
- CI gate (`npx vitest run`) now fully green.

---

## Recommendation

When adding new exports to `server/db.ts` that are imported on the `appRouter` load path, run `scripts/align-db-mocks.mjs` or add the export to `routerDbMockExports` and update router-test mocks proactively.

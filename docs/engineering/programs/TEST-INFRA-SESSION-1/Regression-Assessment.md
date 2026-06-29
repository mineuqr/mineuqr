# TEST-INFRA-SESSION-1 — Regression Assessment

**Program:** TEST-INFRA-SESSION-1  
**Date:** 2026-06-29

---

## Files Changed

| File | Change type | Production impact |
|------|-------------|-------------------|
| `server/_core/sessionRevocation.test.ts` | Test fix (primary) | None |
| `server/table-order.test.ts` | Test fix (correlated) | None |

---

## Primary Fix — `sessionRevocation.test.ts`

**Behavior tested:** Session revocation boundary (`sessionValidAfter`) in `sdk.authenticateRequest`.

**Regression risk:** None to production. The test exercises the same code path with the same expected rejection. Only the test harness changed (mock strategy).

**Verification:**
- Test passes in isolation
- Test passes under 5+ consecutive parallel full-suite runs
- Duration reduced from ~4–5s to ~15–48ms

---

## Correlated Fix — `table-order.test.ts`

During full-suite validation after the session fix, `table-order.test.ts` intermittently failed with the same `Test timed out in 5000ms` signature on:

```
AddToCartButton integration > should export AddToCartButton component
```

**Cause:** Dynamic `await import("../client/src/components/AddToCartButton")` under parallel load (~4961ms).

**Fix:** Replaced dynamic imports with static top-level imports. Assertions unchanged.

**Scope note:** This was not the primary program target but blocked the exit criterion of five consecutive full-suite greens. It is the same failure class (cold dynamic import under parallel contention). No production code touched.

---

## Production Code

**No production files modified.**

Verified unchanged:
- `server/_core/sdk.ts` — session revocation logic intact
- `server/_core/env.ts` — ENV evaluation unchanged
- `server/db.ts` — no changes

---

## Other Tests

No changes to:
- `auth-security-config.test.ts` (uses `vi.resetModules` in `afterEach` for its own env isolation — unrelated, still passes)
- `OrderProjectionConsumerRegistry.test.ts` or other order/read tests
- Vitest config or global setup

---

## Residual Risk

| Risk | Assessment |
|------|------------|
| Other tests using `vi.resetModules()` + heavy dynamic imports | Low — none observed failing in 5 consecutive full runs post-fix |
| Mock divergence from real `ENV` shape | Low — sdk only reads `appId` and `cookieSecret` on this path |
| `vi.mock("../db")` missing exports | Low — test only calls `getUserByOpenId`; sdk path does not call other db exports when `lastSignedIn` is recent |

---

## Verdict

**No production regression.** Test infrastructure stabilized. Repository ready for subsequent architecture programs.

# TEST-INFRA-SESSION-1 — Fix Explanation

**Program:** TEST-INFRA-SESSION-1  
**Date:** 2026-06-29  
**File:** `server/_core/sessionRevocation.test.ts`

---

## Strategy

Eliminate `vi.resetModules()` and dynamic imports by using **Vitest-hoisted `vi.mock()`** for the modules that required environment isolation (`env`, `db`).

This preserves test intent without cold-reloading the heavy `db.ts` module graph on every run.

---

## Before

```typescript
vi.resetModules();
vi.stubEnv("NODE_ENV", "development");
vi.stubEnv("JWT_SECRET", "test-jwt-secret-32-chars-minimum-aaaaaaaa");
vi.stubEnv("VITE_APP_ID", "test-app");

const { sdk } = await import("./sdk");
const db = await import("../db");
vi.spyOn(db, "getUserByOpenId").mockResolvedValue({ ... });
```

**Problems:**
- `vi.resetModules()` clears entire module cache
- Dynamic imports reload `sdk` → `db.ts` (+ ~1,400 lines of dependencies)
- ~700ms isolated → ~4–5s parallel → timeout at 5000ms

---

## After

```typescript
vi.mock("./env", () => ({
  ENV: {
    appId: "test-app",
    cookieSecret: "test-jwt-secret-32-chars-minimum-aaaaaaaa",
    isProduction: false,
  },
}));

vi.mock("../db", () => ({
  getUserByOpenId: vi.fn(),
}));

import { sdk } from "./sdk";
import * as db from "../db";
```

**Why this works:**
- `vi.mock` is hoisted — mocks apply before `sdk` loads
- `sdk` imports mocked `env` and `db` (lightweight stubs)
- Real `db.ts` never loads in this test file
- Static imports are cached across tests in the same worker
- `ENV.cookieSecret` is fixed at mock definition time (same effective behavior as stubEnv + reset)

---

## Assertions Unchanged

The test still verifies:

1. `sdk.signSession` produces a valid JWT for `appId: "test-app"`
2. `getUserByOpenId` returns a user with `sessionValidAfter` 10s in the future
3. `sdk.authenticateRequest` rejects with `/Invalid session cookie/` when `session.iat < sessionValidAfter`

No assertions weakened. No coverage removed.

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Isolated test duration | ~700ms | ~15ms |
| Parallel full-suite duration | ~4300–5027ms | ~32–48ms |

---

## Production Impact

**None.** Only `sessionRevocation.test.ts` changed. No production files modified.

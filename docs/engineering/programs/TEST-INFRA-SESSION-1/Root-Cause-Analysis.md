# TEST-INFRA-SESSION-1 — Root Cause Analysis

**Program:** TEST-INFRA-SESSION-1  
**Date:** 2026-06-29  
**Verdict:** Proven root cause — module cache invalidation + heavy cold import under parallel CPU contention

---

## Symptom

`sessionRevocation.test.ts` intermittently fails under parallel full-suite execution with:

```
Error: Test timed out in 5000ms.
```

Passes in isolation every time.

---

## Evidence

### 1. Failure is timeout, not assertion failure

Captured error from parallel run:

```
FAIL  server/_core/sessionRevocation.test.ts > ... > rejects sessions issued before sessionValidAfter
Error: Test timed out in 5000ms.
```

No `expect()` mismatch. The test body does not complete within the default timeout.

### 2. Duration correlates with parallel load

| Context | Typical test body duration |
|---------|---------------------------|
| Isolated (`npx vitest run` single file) | ~700ms |
| Parallel full suite (passing) | ~4300–4400ms |
| Parallel full suite (failing) | ~5018–5027ms (timeout) |

The test completes just under 5000ms when passing under load, and exceeds 5000ms when failing. This is **resource contention**, not non-deterministic logic.

### 3. Trigger: `vi.resetModules()` + dynamic imports

Pre-fix test structure:

```typescript
vi.resetModules();
vi.stubEnv("NODE_ENV", "development");
vi.stubEnv("JWT_SECRET", "...");
vi.stubEnv("VITE_APP_ID", "test-app");
const { sdk } = await import("./sdk");          // cold import #1
const db = await import("../db");               // cold import #2
vi.spyOn(db, "getUserByOpenId").mockResolvedValue(...);
```

**Why `vi.resetModules()` was used:** `ENV` in `server/_core/env.ts` evaluates `cookieSecret` from `process.env.JWT_SECRET` at **module load time**. The test needed a fresh `env` + `sdk` load after `vi.stubEnv`.

**Cost of reset:** `vi.resetModules()` invalidates the entire module cache in the worker. Each test run forces:

1. Re-parse and re-execute `server/_core/sdk.ts`
2. Re-parse and re-execute `server/db.ts` (~1387 lines)
3. Re-load transitive graph: `drizzle-orm`, `mysql2`, `drizzle/schema`, `platformAccount`, subscription helpers, etc.

Under parallel execution (192 test files, default Vitest thread pool), CPU and transform cache contention pushes cold-import time from ~700ms to ~4–5s.

### 4. Ruled-out causes

| Hypothesis | Evidence against |
|------------|------------------|
| Shared mutable production state | Failure is timeout; assertion never reached inconsistently |
| Database connection hang | `getUserByOpenId` is spied before `authenticateRequest`; timeout occurs during import phase |
| Race in session revocation logic | Isolated runs always pass; same logic, faster imports |
| `sessionAudit` global cache leak | Ops counter works correctly when test completes |
| Mock leakage from other tests | Failure is duration-bound, not wrong throw/no-throw |
| `vi.stubEnv` cross-worker pollution | Workers are isolated; failure is within single test duration |
| Deadlock | Failure at exactly ~5018–5027ms (timeout boundary), not indefinite hang |

### 5. Dependency audit

| Dependency | Loaded how | Survives across tests? | Issue? |
|------------|-----------|------------------------|--------|
| `./sdk` | Dynamic import after `resetModules` | Re-loaded every test | Heavy |
| `../db` | Dynamic import | Re-loaded every test | **Primary cost** |
| `./env` | Via sdk import | Re-evaluated on reset | Motivated resetModules |
| `jose` (JWT) | Via sdk | Re-loaded on reset | Moderate |
| `./sessionAudit` | Via sdk | Re-loaded on reset | Light |
| `mysql2` / drizzle | Via db.ts | Re-loaded on reset | Heavy |

**Nothing in the test leaked state that caused incorrect results** — the issue was **repeated expensive cold module loading** on every test invocation under parallel CPU pressure.

---

## Root Cause (Proven)

> **`vi.resetModules()` combined with dynamic `import()` of `sdk` and `db.ts` forces a full cold reload of a large module graph on every test run. Under parallel Vitest execution, this reload takes 4–5 seconds, intermittently exceeding Vitest's default 5000ms `testTimeout`.**

Classification: **module cache invalidation** + **parallel resource contention** (not production defect).

---

## Correlated Finding (Out of Primary Scope)

`server/table-order.test.ts` exhibited the same timeout pattern (~4961ms) from dynamic `import()` of React components under parallel load. Static imports were applied during validation to achieve five consecutive full-suite greens. See Regression Assessment.

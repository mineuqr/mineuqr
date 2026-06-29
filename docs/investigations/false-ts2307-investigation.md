# Investigation — False TypeScript Diagnostic (ts2307)

**Date:** 2026-06-29  
**Scope:** Investigation only — no source changes  
**Subject file:** `server/order/read/infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts`

---

## Executive Summary

The diagnostic is **not a false positive**. `npm run check` passes because the root `tsconfig.json` **excludes all `**/*.test.ts` files**, so the compiler never typechecks this import. Cursor’s TypeScript language server **does** analyze open test files and correctly reports `ts2307` for the import that exists on disk.

The on-disk import uses **three** `..` segments (`../../../`). That is **one level short** for a file inside `__tests__/`. The correct path from that directory requires **four** segments (`../../../../`), as used by the sibling test `CompositeEventDispatchDelegate.test.ts`.

**Root cause:** `tsconfig.json` `exclude` hides test-file module errors from `tsc --noEmit`, while the editor language server still validates the open test file and surfaces a real resolution failure.

---

## 1. Import Path Verification

### Subject file (on disk)

```typescript
import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
```

| Item | Value |
|------|-------|
| Test file | `c:\mineuqr\server\order\read\infrastructure\registry\__tests__\OrderProjectionConsumerRegistry.test.ts` |
| Import specifier (on disk) | `../../../infrastructure/events/EventEnvelope` |
| Resolved path (on disk import) | `c:\mineuqr\server\order\read\infrastructure\events\EventEnvelope` |
| Target exists? | **No** |

### Correct path for `__tests__/` depth

| Item | Value |
|------|-------|
| Correct specifier | `../../../../infrastructure/events/EventEnvelope` |
| Resolved path | `c:\mineuqr\server\order\infrastructure\events\EventEnvelope` |
| Target exists? | **Yes** |

Path resolution (Node `path.normalize` from test file directory):

```
../../../infrastructure/events/EventEnvelope
  → server/order/read/infrastructure/events/EventEnvelope   (missing)

../../../../infrastructure/events/EventEnvelope
  → server/order/infrastructure/events/EventEnvelope        (exists)
```

### Note on reported vs on-disk import

The investigation brief quotes Cursor showing:

```
Cannot find module '../../../../infrastructure/events/EventEnvelope'
```

**On-disk git content** (working tree clean at investigation time) uses `../../../`, not `../../../../`. The sibling file `CompositeEventDispatchDelegate.test.ts` correctly uses `../../../../`. The reported four-level path may reflect a different buffer state, confusion with the sibling test, or an IDE message referring to the intended/correct target. Evidence below is based on **verified on-disk content**.

### Why production files use `../../../` (and that is correct)

From `server/order/read/infrastructure/registry/OrderProjectionConsumerRegistry.ts` (one directory above `__tests__/`):

```
../../../infrastructure/events/EventEnvelope
  → server/order/infrastructure/events/EventEnvelope   (exists)
```

The test file is one level deeper; it cannot reuse the same relative path without being wrong.

---

## 2. Canonical `EventEnvelope`

| Item | Value |
|------|-------|
| **Location** | `server/order/infrastructure/events/EventEnvelope.ts` |
| **Exports** | `EventEnvelope` (type), `EventEnvelopeStatus`, `PendingOutboxRecord`, `StoredOutboxRecord`, `ORDER_AGGREGATE_TYPE` |
| **Duplicate copies** | **None** — single file in repository (`Glob **/EventEnvelope.ts` → 1 result) |

Other read-module imports:

| File | Import depth | Valid? |
|------|--------------|--------|
| `OrderProjectionConsumer.ts` | `../../../../` | Yes |
| `CompositeEventDispatchDelegate.test.ts` | `../../../../` | Yes |
| `OrderProjectionConsumerRegistry.test.ts` | `../../../` | **No** |
| `OrderProjectionConsumerRegistry.ts` | `../../../` | Yes (different base dir) |

---

## 3. Compiler vs Editor

### `npm run check` (`tsc --noEmit`)

| Behavior | Evidence |
|----------|----------|
| Succeeds | `npm run check` exit code 0 (verified) |
| Test file not in program | `tsc --listFilesOnly` lists `OrderProjectionConsumerRegistry.ts` but **not** `OrderProjectionConsumerRegistry.test.ts` |
| Reason | `tsconfig.json` line 3: `"exclude": [..., "**/*.test.ts"]` |

### Direct typecheck of test file

```bash
npx tsc --noEmit server/order/read/infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts
```

Produces:

```
error TS2307: Cannot find module '../../../infrastructure/events/EventEnvelope'
```

### Sibling test with correct import

```bash
npx tsc --noEmit server/order/read/infrastructure/registry/__tests__/CompositeEventDispatchDelegate.test.ts
```

No `EventEnvelope` ts2307 (other node_modules noise only).

### Vitest

| Behavior | Evidence |
|----------|----------|
| Tests pass | `npx vitest run ...OrderProjectionConsumerRegistry.test.ts` — 4/4 pass |
| Why wrong import still runs | `EventEnvelope` is a **type-only** import; erased at transform time; Vitest/esbuild does not require runtime resolution |

### Cursor / TypeScript language server

Open excluded files are still analyzed when visible in the editor. The language server applies module resolution to the open buffer and reports `ts2307` when the resolved path does not exist — consistent with direct `tsc` on that file.

**Conclusion:** This is not stale-cache behavior. It is **compiler vs editor project membership mismatch** plus a **real incorrect relative import** in the test file.

---

## 4. tsconfig Audit

Single project file: `tsconfig.json` (no `references`, no `tsconfig.test.json`, no Vitest-specific tsconfig).

| Option | Value | Notes |
|--------|-------|-------|
| `include` | `server/**/*`, `client/src/**/*`, `shared/**/*`, `src/**/*`, `drizzle/**/*`, `api/**/*` | Broad include |
| `exclude` | `node_modules`, `build`, `dist`, **`**/*.test.ts`** | **Test files excluded from `tsc` program** |
| `references` | none | |
| `rootDir` | unset | |
| `baseUrl` | `.` | |
| `paths` | `@/*`, `@shared/*`, `@commercial/*` | No mapping for `EventEnvelope` |
| `moduleResolution` | `bundler` | |

**Editor vs compiler load the same `tsconfig.json`**, but:

- **Compiler (`npm run check`):** excluded files are omitted → no test import errors.
- **Editor:** open excluded files still receive diagnostics → test import errors visible.

---

## 5. Workspace

| Check | Result |
|-------|--------|
| Git root | `C:\mineuqr` |
| Nested duplicate repo | None |
| `.code-workspace` files | None |
| `.vscode/` / `.cursor/` project overrides | None found |

Single-folder workspace; no duplicate-root or multi-root workspace evidence.

---

## 6. Language Server Restart

**Restarting the TypeScript language server alone will not reliably clear this error.**

| Reason | Detail |
|--------|--------|
| Not stale resolution | Direct `tsc` on the file reproduces ts2307 without IDE involvement |
| Underlying import is invalid on disk | `../../../` resolves to a non-existent path under `server/order/read/infrastructure/events/` |
| Exclude persists | After restart, tsserver still analyzes open test files against the same `tsconfig` |

Restart may temporarily hide squiggles during reinitialization, but the error will return when the file is rechecked unless the import or tsconfig test coverage changes.

---

## 7. Root Cause (ranked)

### Primary (proven)

**`tsconfig.json` excludes `**/*.test.ts`, so `npm run check` never validates test imports, while the IDE typechecks the open test file and reports a genuine module resolution failure.**

Evidence: `exclude` in tsconfig; test file absent from `--listFilesOnly`; direct `tsc` on test file fails with ts2307; `npm run check` passes.

### Contributing (proven)

**Incorrect relative import in `OrderProjectionConsumerRegistry.test.ts`: `../../../` is one `..` short for `__tests__/` depth.**

Evidence: path resolution table; sibling test uses `../../../../`; production `registry/*.ts` correctly uses `../../../` from its directory.

### Ruled out

| Hypothesis | Ruling |
|------------|--------|
| Missing `EventEnvelope` file | File exists at `server/order/infrastructure/events/EventEnvelope.ts` |
| Duplicate `EventEnvelope` modules | Only one copy |
| `paths` / `baseUrl` mismatch | No path alias involved |
| Multiple workspaces | Single git root, no workspace file |
| Production regression | Production registry imports resolve correctly |
| Vitest misconfiguration | Vitest passes due to type erasure, not because import is valid |

### Unresolved (low probability)

Reported diagnostic text references `../../../../` while on-disk import is `../../../`. Most likely explanation: brief conflated with `CompositeEventDispatchDelegate.test.ts` or an unsaved local edit since reverted. **Does not change root cause.**

---

## Recommended Corrective Actions

Investigation only — no changes applied. Recommended follow-up (separate change):

1. **Fix the test import** to `../../../../infrastructure/events/EventEnvelope` (align with `CompositeEventDispatchDelegate.test.ts` and `OrderProjectionConsumer.ts` depth rules).
2. **Close the `npm run check` / IDE gap** — choose one:
   - Add `tsconfig.test.json` (or remove `**/*.test.ts` from exclude) and run `tsc -p tsconfig.test.json` in CI, or
   - Add a `npm run check:tests` script that typechecks test files.
3. **Do not rely on TS server restart** as a fix.

---

## Evidence Commands (reproducible)

```bash
npm run check
# exit 0

npx tsc --noEmit -p tsconfig.json --listFilesOnly | findstr OrderProjectionConsumerRegistry
# lists .ts production file only, not .test.ts

npx tsc --noEmit server/order/read/infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts
# TS2307 on ../../../infrastructure/events/EventEnvelope

node -e "const path=require('path'); const d='server/order/read/infrastructure/registry/__tests__'; console.log(path.normalize(path.join(d,'../../../infrastructure/events/EventEnvelope'))); console.log(path.normalize(path.join(d,'../../../../infrastructure/events/EventEnvelope')));"

npx vitest run server/order/read/infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts
# 4/4 pass
```

---

## Verdict

| Question | Answer |
|----------|--------|
| Is this a false diagnostic? | **No** — IDE is correct for the on-disk test file |
| Why does `npm run check` pass? | Test files excluded from compilation |
| Is the import wrong? | **Yes** on disk (`../../../`); should be `../../../../` from `__tests__/` |
| Corrective action | Fix import + add test typechecking to CI (optional but recommended) |

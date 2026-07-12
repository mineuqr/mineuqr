# SCREEN-PAIRING-RENDER-FORENSICS-1

**Classification:** Production Incident — Forensics Only  
**Severity:** P1  
**Status:** INVESTIGATION COMPLETE  
**Date:** 2026-07-12  
**Related Programs:** SCREEN-PAIRING-CODE-1, SCREEN-AUTH-RECOVERY-1

---

## Executive Summary

Production `/screen` visits fail with **React minified error #185** before the operator reaches a usable pairing or runtime screen. Forensic analysis identifies the root cause as an **infinite re-render loop** triggered by **`useOperationalScreenCredentials()`** introduced in commit **`dd8a527`** (SCREEN-PAIRING-CODE-1).

The hook uses `useSyncExternalStore` with `readOperationalScreenCredentials` as `getSnapshot`. That function **returns a new object reference on every call** when credentials exist in `localStorage`. React treats each render as a store change and re-renders until **Maximum update depth exceeded** (error #185).

The exception is thrown during render of **`OperationalScreenEntry`**, which is **outside** `ScreenErrorBoundary`'s catch scope. The top-level application **`ErrorBoundary`** (`client/src/components/ErrorBoundary.tsx`) displays the failure — matching production symptoms.

**Pairing UI components (`PairingShell`, `ScreenPairingProvider`) are not the throw site.** They are unreachable on the primary failure path when valid-shaped credentials remain in `localStorage` (typical kitchen display scenario).

**Verdict: Root Cause Identified**

No fixes were applied in this program.

---

## Production Evidence

| Observation | Detail |
|-------------|--------|
| URL | `https://mineuqr.com/screen` |
| User-visible failure | Application Error Boundary (Arabic/English generic error UI) |
| Console / overlay error | `Minified React error #185` |
| Pairing UI reached | No |
| Runtime operational | No |

Production builds minify React error text. Error #185 decodes to the invariant below.

---

## Full React Error (Decoded)

**Minified code:** `#185`

**Full invariant message (React production decoder / React docs):**

```text
Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
```

**React 19 variant (useEffect-related wording also cited for #185 family):**

```text
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

For this incident, the mechanism is **`useSyncExternalStore` receiving an unstable `getSnapshot`**, which React documents as equivalent to an infinite update loop during render.

---

## Complete Stack Trace (Expected Development Build)

A development build was not deployed to production. Based on code path analysis and React `useSyncExternalStore` behavior, the expected development stack is:

```text
Error: Maximum update depth exceeded.
    at throwIfInfiniteUpdateLoopDetected (react-dom/client)
    at renderRootSync (react-dom/client)
    at performWorkOnRoot (react-dom/client)
    ...
    at useSyncExternalStore (react)
    at useOperationalScreenCredentials (client/src/lib/operational-screen/useOperationalScreenCredentials.ts:22)
    at OperationalScreenEntry (client/src/pages/screen/OperationalScreenEntry.tsx:54)
    at renderWithHooks (react-dom/client)
    ...
    at Router (client/src/App.tsx:67)
    at App (client/src/App.tsx:120)
    at ErrorBoundary (client/src/components/ErrorBoundary.tsx:99)
```

| Frame | Role |
|-------|------|
| **First application throw site** | `useOperationalScreenCredentials` → `useSyncExternalStore` |
| **First failing component** | `OperationalScreenEntry` |
| **Parent chain** | `Router` → `App` → root `ErrorBoundary` |
| **NOT in stack** | `PairingShell`, `ScreenPairingProvider`, `useRuntimeOrchestrator` |

`ScreenErrorBoundary` does **not** catch this error because the failure occurs in **`OperationalScreenEntry`'s own render**, not in its children.

---

## Rendering Timeline

```text
/screen
  ↓
main.tsx — trpc.Provider, LanguageProvider
  ↓
App — ErrorBoundary (top-level)
  ↓
Router — Route /screen → OperationalScreenEntry
  ↓
OperationalScreenEntry render begins
  ↓
useOperationalScreenCredentials()
  ↓
useSyncExternalStore(subscribe, readOperationalScreenCredentials, ...)
  ↓
readOperationalScreenCredentials() — localStorage has credentials
  ↓
Returns NEW object { deviceId, tokenId, secret, ... }  ← new reference each call
  ↓
React: snapshot !== previousSnapshot → schedule re-render
  ↓
OperationalScreenEntry render (again)
  ↓
(repeats until React aborts)
  ↓
Exception: Maximum update depth exceeded (#185)
  ↓
App ErrorBoundary — STOPS HERE

NOT REACHED on this path:
  ├─ PairingShell
  ├─ ScreenPairingProvider
  ├─ ScreenRuntimeProvider
  ├─ OperationalScreenRuntimeProvider
  └─ useRuntimeOrchestrator bootstrap
```

### Alternate path (no credentials in localStorage)

```text
/screen → OperationalScreenEntry
  ↓
readOperationalScreenCredentials() → null (stable reference)
  ↓
useSyncExternalStore — no spurious updates
  ↓
PairingShell renders (expected)
```

Static analysis indicates the **credential-present path** is the primary production failure mode for devices that previously paired or hold stale credentials.

---

## First Throw Site

| Property | Value |
|----------|-------|
| **File** | `client/src/lib/operational-screen/useOperationalScreenCredentials.ts` |
| **Function** | `useOperationalScreenCredentials` |
| **Hook** | `useSyncExternalStore` |
| **Line** | 22 |
| **Trigger** | `readOperationalScreenCredentials` used directly as `getSnapshot` |

**Underlying unstable read:**

| Property | Value |
|----------|-------|
| **File** | `client/src/lib/operational-screen/credentialStore.ts` |
| **Function** | `readOperationalScreenCredentials` |
| **Lines** | 35–41 (object literal construction) |

**Exception origin class:** React hook / external store subscription — **not** Pairing UI, router, tRPC query, or runtime orchestrator.

---

## Runtime State Verification

| State | Initialized before crash? | Evidence |
|-------|---------------------------|----------|
| Runtime Context | **No** | `OperationalScreenRuntimeProvider` never mounts |
| Credential Store (localStorage) | **Read** | Crash triggered by reading stored credentials |
| Pairing State | **No** | `PairingShell` not mounted on failure path |
| Recovery State | **No** | `useRuntimeOrchestrator` / `handleRevoked` never runs |
| Bootstrap State | **No** | Bootstrap state machine never starts |

Runtime initialization **does not complete** on the primary failure path. The crash occurs **before** runtime becomes operational.

---

## Pairing Flow Analysis

### Intended flow (no credentials)

```text
No Credential → useOperationalScreenCredentials() → null (stable)
  → PairingShell → ScreenPairingProvider → redeem UI
```

Static analysis: **This path should not trigger error #185** from the identified defect.

### Production-reported flow (credential present)

```text
Credential in localStorage → useOperationalScreenCredentials()
  → unstable object snapshot → infinite re-render → #185
  → PairingShell NEVER rendered
```

**Conclusion:** The new pairing flow **participates indirectly** — SCREEN-PAIRING-CODE-1 replaced synchronous `readOperationalScreenCredentials()` with the reactive hook in `OperationalScreenEntry`. The **Pairing UI itself does not throw**. The regression is in **entry-point credential subscription**, not `PairingShell` render logic.

Kitchen displays with existing `mineuqr:operational-screen:credentials:v1` entries cannot reach pairing UI or runtime recovery.

---

## Regression Analysis

| Commit | Status |
|--------|--------|
| **`dd8a527`** — `feat(screen): implement SCREEN-PAIRING-CODE-1` | **First bad commit** |
| **`02626cd`** — prior HEAD (architecture doc only) | Last known good for `/screen` entry behavior |
| Pre-`dd8a527` `OperationalScreenEntry` | Used synchronous `readOperationalScreenCredentials()` — stable |

**`dd8a527` changes to `OperationalScreenEntry.tsx`:**

- Removed: synchronous credential read + redirect to `/screen/pair`
- Added: `useOperationalScreenCredentials()` + inline `PairingShell`

**`dd8a527` additions:**

- `useOperationalScreenCredentials.ts` (new)
- Credential change events in `credentialStore.ts`

**Not implicated:** SCREEN-AUTH-RECOVERY-1 (orchestrator redirect change only), SCREEN-MANAGEMENT-UX, server pairing domain.

---

## Component Dependency Analysis

### `OperationalScreenEntry` dependencies (failure path)

| Dependency | Fails? | Notes |
|------------|--------|-------|
| `useOperationalScreenCredentials` | **YES — first** | Unstable `getSnapshot` |
| `readOperationalScreenCredentials` | **YES — root** | New object per call |
| `ScreenErrorBoundary` | No | Does not catch own parent errors |
| `ScreenPairingProvider` | Not reached | |
| `PairingShell` | Not reached | |
| `ScreenRuntimeProvider` | Not reached | |
| `OperationalScreenRuntimeProvider` | Not reached | |
| `useRuntimeOrchestrator` | Not reached | |
| App `Router` / `LanguageProvider` | No | Stable |

### Forensic evidence test

`client/src/lib/operational-screen/__tests__/pairingRenderForensics.test.ts` demonstrates:

- With credentials: consecutive `readOperationalScreenCredentials()` calls return **equal but not identical** objects (`toEqual` true, `toBe` false).
- Without credentials: consecutive calls return **identical** `null`.

---

## Production vs Development

| Aspect | Production | Development (expected) |
|--------|------------|----------------------|
| Error text | Minified `#185` | Full "Maximum update depth exceeded" |
| Error Boundary | App `ErrorBoundary` | Same |
| Source maps | Limited | Would name `useOperationalScreenCredentials.ts:22` |
| Repro with credentials in localStorage | **Crash** | **Crash** |
| Repro without credentials | Pairing UI | Pairing UI |

Behavioral difference is **error message verbosity only**; the loop mechanism is build-independent.

---

## Root Cause

**SCREEN-PAIRING-CODE-1** introduced `useOperationalScreenCredentials`, wiring `readOperationalScreenCredentials` directly into `useSyncExternalStore` without snapshot caching.

When `localStorage` contains valid operational screen credentials, every `getSnapshot()` call allocates a **new object**. React's `useSyncExternalStore` requires snapshot **reference stability** between store notifications. Reference instability forces a re-render on every pass; React detects an infinite loop and throws **error #185**.

Because this occurs in **`OperationalScreenEntry`'s render**, the failure surfaces at the **application Error Boundary** before pairing or runtime UI appears.

---

## Minimal Safe Fix Recommendation

**Do not implement in this program.** Recommended direction for a follow-up fix program:

1. **Cache the credential snapshot** in `credentialStore` (or a dedicated store module):
   - Invalidate cache only on `writeOperationalScreenCredentials`, `clearOperationalScreenCredentials`, or `storage` events.
   - Return the **same object reference** from `getSnapshot` until underlying data changes.

2. **Alternative (minimal):** Revert route branching in `OperationalScreenEntry` to synchronous `readOperationalScreenCredentials()` for initial render; use subscription only for post-mount recovery re-renders via a correctly cached external store.

**Explicitly avoid:** Error boundary changes, try/catch suppression, hook rewrites beyond snapshot caching, disabling React warnings.

---

## Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| All kitchen displays with stored credentials blocked | **Critical** | Primary path |
| New pairing validation blocked on reused devices | **High** | Cannot reach PairingShell |
| SCREEN-AUTH-RECOVERY-1 ineffective | **High** | 401 recovery never reached if crash on mount |
| Fresh-browser pairing | **Low** | Null snapshot stable; separate validation recommended |
| Data / auth corruption | **None** | Render-only defect |

---

## Final Verdict

**Root Cause Identified**

The production `/screen` render failure is caused by an **unstable `useSyncExternalStore` snapshot** in **`useOperationalScreenCredentials`**, introduced by **SCREEN-PAIRING-CODE-1** commit **`dd8a527`**. It is **not** caused by Pairing UI components, runtime authentication, or server pairing endpoints.

Implementation of a fix must wait for formal approval of this forensic report.

# PROGRAM BASELINE

**Program:** TYPESCRIPT-DOMAIN-CONTRACT-HARDENING-1  
**Measured:** 2026-08-17  
**Command:** `pnpm check` → `tsc --noEmit`

## Phase 0 — Git safety

| Field | Value |
|-------|--------|
| Branch | `main` |
| HEAD | `dfc8613f99176b7f9e1e87c059dface5aa0120de` |
| origin/main | `dfc8613f99176b7f9e1e87c059dface5aa0120de` |
| Working tree at start | clean |

The program brief named certified TypeScript remediation commit `015798db`. Actual HEAD is **one commit later**:

`dfc8613f` — `FIX_LATER` — `client/src/App.tsx` KioskShell route adapter + kitchen-stream comment.

That commit is already on `origin/main`. It is **not** dirty local work. This program did not revert or reopen it.

## Current baseline (this program)

| Field | Value |
|-------|--------|
| `pnpm check` `error TS*` | **178** |
| App.tsx diagnostics | **0** |
| Raw | `pnpm-check.raw.txt` |
| Fingerprint | `DIAGNOSTIC-FINGERPRINT.json` |

178 = previous certified 184 minus the six App.tsx/KioskShell diagnostics already remediated outside this program. Count was **measured**, not assumed.

## Comparison references

- `ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1/DIAGNOSTIC-FINGERPRINT.json` (188)
- `TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1` after FIX_NOW (184)
- This program start (178)

## Isolation

| Field | Value |
|-------|--------|
| DATABASE MUTATION | 0 |
| PRODUCTION MUTATION | 0 |
| DEPLOYMENT | 0 |
| MIGRATION | 0 |
| Commercial Occupancy | not modified |
| tsconfig | not modified |

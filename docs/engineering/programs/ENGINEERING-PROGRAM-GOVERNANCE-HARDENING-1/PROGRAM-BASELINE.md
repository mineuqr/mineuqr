# PROGRAM BASELINE

**Program:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1  
**Measured:** 2026-08-17  
**Command:** `pnpm check` → `tsc --noEmit`  
**Source mutation before measurement:** none

## Git at program start

| Field | Value |
|-------|--------|
| Branch | `main` |
| HEAD | `5cd84e3e6b27539396cdae5cac9b42482e58b709` |
| origin/main | `5cd84e3e6b27539396cdae5cac9b42482e58b709` |
| HEAD = origin/main | YES |
| Parent of HEAD | `2a5b7deb41032ca9341c87ee19f8a91cb39abfa2` (certified occupancy + governance-hash docs) |
| Latest commit | `docs(commercial): certify deployment and post-deployment smoke` |

Working tree at start (not cleaned, not restored):

```
?? .tmp-ts-baseline.txt
```

`.tmp-ts-baseline.txt` is unexpected residue at repo root. It looks like a prior `tsc --noEmit` capture with a corrupted footer encoding. It is **not** certified baseline evidence. This program did not delete, restore, or commit it.

## TypeScript measurement

| Field | Value |
|-------|--------|
| Command | `pnpm check` |
| Underlying | `tsc --noEmit` |
| Exit | 1 |
| `error TS*` count | **188** |
| Raw capture | `pnpm-check.raw.txt` |
| Fingerprint | `DIAGNOSTIC-FINGERPRINT.json` |

The historical certified count is also 188. That count was **re-measured**, not assumed.

Editor “6 Problems” on `client/src/App.tsx` are **6 of 188**, not the baseline.

## Isolation ledger (this program)

| Field | Value |
|-------|--------|
| PROGRAM START SHA | `5cd84e3e6b27539396cdae5cac9b42482e58b709` |
| PROGRAM END SHA | `5cd84e3e6b27539396cdae5cac9b42482e58b709` |
| FILES CHANGED (source) | 0 |
| FILES CREATED | this documentation package only |
| FILES DELETED | 0 |
| FILES RESTORED | 0 |
| DATABASE MUTATION | 0 |
| PRODUCTION MUTATION | 0 |
| DEPLOYMENT | 0 |
| MIGRATION | 0 |
| TEST DELTA | not run (governance-only) |
| TS DELTA vs this measurement | 0 (no source change after capture) |

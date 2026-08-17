# BASELINE

**Program:** TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1  
**Measured:** 2026-08-17  
**Command:** `pnpm check` → `tsc --noEmit`  
**Source mutation before forensic measurement:** none

## Phase 0 — Git safety

| Field | Value |
|-------|--------|
| Branch | `main` |
| HEAD | `aeee3f4674f7541f03f21b1cab64045624e66e44` |
| origin/main | `aeee3f4674f7541f03f21b1cab64045624e66e44` |
| HEAD = origin/main | YES |
| Working tree | clean |
| Latest commit | `docs(engineering): certify program governance hardening` |

Phase 0 PASS. No reset, restore, clean, or overwrite.

## Phase 1 — Authoritative TypeScript measurement

| Field | Value |
|-------|--------|
| Command | `pnpm check` |
| Underlying | `tsc --noEmit` |
| Exit | 2 (tsc error population; expected) |
| `error TS*` count | **188** |
| Raw capture | `pnpm-check.raw.txt` |
| Fingerprint | `DIAGNOSTIC-FINGERPRINT.json` |
| Codes | 19 |
| Files | 82 |

Editor Problems on `client/src/App.tsx` are **6 of 188**, not the baseline.

188 is a measured baseline, not a target. This file is not rewritten after remediation.

## Error code distribution (forensic 188)

| Code | Count |
|------|------:|
| TS2802 | 118 |
| TS2322 | 21 |
| TS2345 | 8 |
| TS2339 | 7 |
| TS2459 | 7 |
| TS2724 | 5 |
| TS2352 | 3 |
| TS2769 | 3 |
| TS7006 | 3 |
| TS2305 | 2 |
| TS2367 | 2 |
| TS7053 | 2 |
| TS1355 | 1 |
| TS18049 | 1 |
| TS2353 | 1 |
| TS2677 | 1 |
| TS2694 | 1 |
| TS2739 | 1 |
| TS7016 | 1 |

## File distribution (top)

| File | Count |
|------|------:|
| `server/services/commercial-catalog/livePlanPersistence.ts` | 29 |
| `server/services/commercial-catalog/index.ts` | 26 |
| `server/crmp/InMemoryCrmpStore.ts` | 7 |
| `client/src/App.tsx` | 6 |
| `server/services/commercial-catalog/adoptionService.ts` | 6 |
| `server/operational-session/check/read/splitPaymentProjectionStore.ts` | 5 |
| `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` | 5 |

Full file map: `DIAGNOSTIC-FINGERPRINT.json` → `byFile`.

## Certified fingerprint compared

`docs/engineering/programs/ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1/DIAGNOSTIC-FINGERPRINT.json`

Exact identity match of all 188 keys. See DIAGNOSTIC-COMPARISON.md.

## Isolation ledger (forensic start)

| Field | Value |
|-------|--------|
| PROGRAM START SHA | `aeee3f4674f7541f03f21b1cab64045624e66e44` |
| DATABASE MUTATION | 0 |
| PRODUCTION MUTATION | 0 |
| DEPLOYMENT | 0 |
| MIGRATION | 0 |

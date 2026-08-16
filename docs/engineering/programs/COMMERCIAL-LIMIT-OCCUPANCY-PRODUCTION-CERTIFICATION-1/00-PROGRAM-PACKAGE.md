# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Canonical:** COMMERCIAL PRODUCTION CERTIFICATION  
**Date:** 2026-08-17  
**STATUS:** PASS — COMMERCIAL PRODUCTION CERTIFIED  
**Mode:** PRODUCTION FORENSICS → SCHEMA VERIFICATION → APPLICATION COMPATIBILITY → COMMERCIAL OCCUPANCY CERTIFICATION  

| Item | Value |
|------|--------|
| Production target | `mineuqr` |
| Production host | `gateway01.eu-central-1.prod.aws.tidbcloud.com:4000` |
| Production user prefix | `43cECBySTU9sFco` |
| Identity | `ACCEPT_PRODUCTION` |
| Journal tail | `0094_commercial_limit_occupancy_locks` (id 6204102, exactly once) |
| 0094 hash | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |
| Lock table | `commercial_limit_occupancy_locks` PK `(scopeKind, scopeId, limitKey)` |
| Production mutation | **0** |
| Application change | NONE |
| Migration | NONE (`pnpm db:migrate` not run) |
| Deploy | NONE |
| Git | NONE |

## Verdict in one sentence

Production already has the certified 0094 lock table; the working-tree occupancy application is schema-compatible and ready to deploy after the forthcoming Git/governance 0094 correction.

## Must (honored)

Read-only Production identity, journal, schema, limits, and occupancy census. Local build / TS 188 / G-07…G-11. Certify deployment readiness. Do not deploy.

## Must not (honored)

Insert / update / delete / seed / repair / alter / migrate / backfill Production. `pnpm db:migrate`. Application redesign. Git add/commit/push. Deploy. Start POS-READ-APIS-IMPLEMENTATION-1.

## Evidence

`PRODUCTION-CERTIFICATION-EVIDENCE.json` — SELECT-only Production snapshot.  
`_readonly-certification.mjs` — the read-only inspector (refuses non-SELECT; refuses G07/stagIn).

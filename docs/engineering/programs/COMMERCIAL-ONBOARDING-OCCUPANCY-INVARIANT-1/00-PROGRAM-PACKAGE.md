# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1  
**Audit id:** G-04  
**Date:** 2026-08-16  
**Mode:** AUDIT → IMPLEMENT → TEST → CERTIFY  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1  
**Related:** COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1 · COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-APPLY-1  
**STATUS:** PASS — LOCALLY CERTIFIED  

| Item | Value |
|------|--------|
| Decision | **A** — explicit Commercial validation that the trial/onboarding plan permits `restaurants` proposedTotal = 1 |
| Occupancy helper on this path | **Not used** (cannot join the existing user+restaurant+trial transaction) |
| Migration | NONE |
| Production mutation | 0 |
| Commit / push / deploy | NONE |
| Targeted tests | 5 files / 27 passed |
| Combined regression | 62 files / 415 passed |
| Build | PASS |
| Check | 188 `error TS*` — matches baseline |

Closes G-04: first-restaurant onboarding cannot silently create a restaurant when the effective Commercial restaurant limit is below 1, missing, invalid, or unresolvable.

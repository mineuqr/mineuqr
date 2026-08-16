# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1  
**Canonical:** G-08  
**Date:** 2026-08-16  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-SERIALIZATION-HARDENING-1  
**STATUS:** PASS — DOMAIN OCCUPANCY INVARIANT HOLDS  
**Mode:** AUDIT → RACE ANALYSIS → TEST → HARDEN IF REQUIRED → CERTIFY  

| Item | Value |
|------|--------|
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Database | mineuqr |
| Connection | G07_DATABASE_URL only |
| Production mutation | 0 |
| Migration | NONE |
| Hardening | NONE (no occupancy > cap) |
| TiDB domain races | 18 passed |
| Guards | 21 passed |
| Build | PASS |
| Check | 193 `error TS*` — G-08 files add 0; +5 vs claimed 188 are G-07 helpers |
| Git / deploy | NONE |

## Mission

Prove that Commercial **domain workflows** (not only `withCommercialLimitOccupancy`) cannot violate `occupancy <= commercial cap` through create, replace, delete, hard-delete, onboarding, POS provision/replace, plan change, or concurrent same-tenant operations.

## Result

Creates that consume a slot remain serialized by the G-07 primitive. Deletes do not maintain a second counter. Actual `COUNT(*)` never exceeded cap in any TiDB race.

Cascade parent-delete vs child-create can leave an orphan row after the restaurant is gone. That is **not** occupancy > cap. It is documented as a cascade TOCTOU. No POS-specific workaround was added.

## Must not (honored)

POS-specific lock · occupancy counter · Redis · app-memory lock · global lock · hide orphans from COUNT · Production mutation · git commit/push · deploy · start G-09+

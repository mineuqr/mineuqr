# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  
**Canonical:** G-09  
**Date:** 2026-08-17  
**Predecessor:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**STATUS:** PASS — ADMIN QUANTITY CREATES RESPECT COMMERCIAL CAPS  
**Mode:** FORENSIC AUDIT → POLICY VERIFICATION → IMPLEMENT → TIDB CERTIFY  

| Item | Value |
|------|--------|
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Database | mineuqr |
| Connection | G07_DATABASE_URL only |
| Production mutation | 0 |
| Migration | NONE (0094 untouched) |
| Policy | Capacity belongs to the tenant resource. Caller role does not grant extra slots. |
| Implementation | Admin category/item create uses `createCategoryWithCommercialLimit` / `createMenuItemWithCommercialLimit` |
| TiDB G-09 races | 10 passed |
| Build | PASS |
| Check | **188** `error TS*` (188→193 delta investigated and restored) |
| Git / deploy | NONE |

## Mission

Close the G-08 policy gap: admin category/item create bypassed Commercial quantity occupancy. The invariant is `occupancy <= effective commercial cap` for every Commercial-governed resource unless an explicit exemption exists.

## Result

No admin-specific limiter. Same G-07 occupancy primitive, same G-08 parent-row lock order, same G-06 error mapping. Owner ∥ admin last-slot race: occupancy = cap, exactly one success.

## Must not (honored)

Admin limits · admin counters · second Commercial system · POS-specific Commercial logic · role-based occupancy bypass · modify 0094 · Production mutation · git · deploy · start G-10 / G-11 / Final Occupancy Audit / POS-READ-APIS

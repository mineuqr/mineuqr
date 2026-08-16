# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  
**Canonical:** G-10  
**Date:** 2026-08-17  
**Predecessor:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1 (G-09)  
**STATUS:** PASS — POLICY CONFIRMED, NO IMPLEMENTATION REQUIRED  
**Mode:** FORENSIC AUDIT → POLICY DECISION → IMPLEMENT IF REQUIRED → TIDB CERTIFY  

| Item | Value |
|------|--------|
| Policy | **E** — catalog/location: all persisted rows occupy; POS: provisioned lifecycles occupy |
| Implementation | NONE REQUIRED (COUNT queries already match) |
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Connection | G07_DATABASE_URL |
| Production mutation | 0 |
| Migration | NONE |
| TiDB G-10 | 9 passed |
| Guards | 3 passed |
| Check | 188 |
| Build | PASS |
| Git / deploy | NONE |

## Decision in one sentence

Operational flags (`isActive` / `isAvailable`) do not release Commercial capacity; POS `deactivated` / `replaced` are not provisioned allocations and therefore are not counted.

## Must not (honored)

Shadow counters · hiding inactive from COUNT without policy · G-11 freeze · POS-specific Commercial system · Production mutation · git · deploy · start G-11+

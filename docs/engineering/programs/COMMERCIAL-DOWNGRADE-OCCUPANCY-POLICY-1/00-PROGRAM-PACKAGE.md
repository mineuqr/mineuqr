# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  
**Canonical:** G-11  
**Date:** 2026-08-17  
**Predecessor:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1 (G-10)  
**STATUS:** PASS — POLICY B CONFIRMED; MINIMAL occupancyDelta=0 CLARIFICATION  
**Mode:** FORENSIC AUDIT → POLICY DECISION → IMPLEMENT IF REQUIRED → TIDB CERTIFY  

| Item | Value |
|------|--------|
| Policy | **B** — existing resources remain operational; new capacity-consuming mutations are rejected while `proposedTotal > effective cap` |
| Implementation | `isNewCapacityDenial` in `commercialLimitOccupancy.ts` (occupancyDelta 0 + hard `limit_exceeded` is not a create denial) |
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Connection | G07_DATABASE_URL |
| Production mutation | 0 |
| Migration | NONE |
| TiDB G-11 | 15 passed |
| Guards | 5 passed |
| Occupancy unit | 8 passed |
| Check | 188 |
| Build | PASS |
| Git / deploy | NONE |

## Decision in one sentence

A Commercial downgrade does not mutate tenant-owned rows. Existing occupancy may exceed the new cap. New capacity (`occupancyDelta = 1`) may not. POS replace (`occupancyDelta = 0`) remains slot-neutral and stays allowed.

## Must not (honored)

Automatic freeze · automatic delete · automatic deactivate · hide-to-satisfy-cap · downgrade debt table · shadow counter · POS-specific Commercial system · G-10 rewrite · Production mutation · git · deploy · start Final Occupancy Audit / Production Certification / POS-READ-APIS

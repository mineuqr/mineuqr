# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-APPLY-1  
**Date:** 2026-08-16  
**Mode:** PRODUCTION MIGRATION ONLY  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1  
**STATUS:** PASS — PRODUCTION APPLY CERTIFIED  

| Item | Value |
|------|--------|
| Production target | `mineuqr` |
| Migration | `0094_commercial_limit_occupancy_locks` |
| Hash | `134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47` |
| Journal id | 6204102 |
| Schema mutation | 1 new empty lock table |
| Business rows | 0 inserted / 0 updated / 0 deleted |
| Application deploy | NONE |
| Commit / push | NONE |

## Must

Apply 0094 to Production after proving journal terminus 0093. Verify schema, journal once, no-op second migrate, 780001 untouched.

## Must not

Modify application source · deploy · commit · push · provision POS/restaurants/subscriptions · apply any migration other than 0094 · proceed to POS-READ-APIS-IMPLEMENTATION-1.

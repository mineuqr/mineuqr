# FINAL REPORT

**PROGRAM:** COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1  

**STATUS:** PASS — LOCALLY CERTIFIED  

**MODE:** AUDIT → IMPLEMENT → TEST → CERTIFY  

**PREDECESSOR:** COMMERCIAL-RESTAURANT-CASCADE-POS-ORPHAN-HARDENING-1; finding G-06 from COMMERCIAL-LIMIT-OCCUPANCY-COMPREHENSIVE-AUDIT-1

---

## ROOT CAUSE

tRPC mapping used `FORBIDDEN` + `غير مصرح بالوصول` for both plan-quota denial and occupancy infrastructure unavailability. POS additionally wrapped both as `PosEntitlementDeniedError`.

## CURRENT ERROR FLOW

Helper → Commercial error classes → `throwCommercialOccupancyTrpcError` (menu creates + POS router) → tRPC. Register HTTP remains G-04.

## COMMERCIAL_LIMIT_EXCEEDED SEMANTICS

Capacity evaluated; request denied. tRPC `FORBIDDEN`. Quota Arabic. `reasonCode` e.g. `limit_exceeded`.

## COMMERCIAL_OCCUPANCY_UNAVAILABLE SEMANTICS

Capacity could not be established (`getDb()` missing). tRPC `INTERNAL_SERVER_ERROR`. Client message without auth copy. Client-safe name `commercial_capacity_unavailable`.

## TRPC/API MAPPING

Infrastructure → existing `INTERNAL_SERVER_ERROR` convention. Business limit → `FORBIDDEN`. Not `UNAUTHORIZED`. G-04 Express 403+JSON `code` preserved.

## FAIL-CLOSED RESULT

No create on limit exceeded (tested). Unavailable still throws before create in production (`db` missing). No unlimited fallback.

## AUTHORIZATION SEPARATION

Auth copy `غير مصرح بالوصول` remains for restaurant access / `restaurant_not_found`. Occupancy unavailable does not use it.

## CONSUMER AUDIT

Restaurants, categories, items, POS provision/replace: shared mapper. No other production occupancy consumers.

## G-04 COMPATIBILITY

Register mapping and guards unchanged. Cap 0 still `CommercialLimitExceededError` / `limit_exceeded`. Unresolvable still `CommercialOccupancyUnavailableError`.

## OBSERVABILITY RESULT

Unavailable now hits existing `trpc_runtime_failure` error logs. Limit exceeded stays expected `FORBIDDEN`.

## IMPLEMENTATION RESULT

Mapper module + plan-limits + POS service/router. Occupancy primitive, COUNT, lock, 0094 unchanged.

## TARGETED TESTS

44 passed

## REGRESSION TESTS

64 files / 424 passed

## BUILD

PASS

## CHECK

188 `error TS*`

## MIGRATION

NONE

## DATABASE MUTATION

0

## PRODUCTION MUTATION

0

## COMMIT

NONE

## PUSH

NONE

## DEPLOY

NONE

## REMAINING RISKS

- tRPC client `data.code` is the tRPC code (`INTERNAL_SERVER_ERROR`), not the string `commercial_capacity_unavailable` (no global errorFormatter). Distinction is tRPC class + message + server `cause`. Express register still exposes JSON `code`.  
- Deadlock after occupancy retries still throws the original DB error (pre-existing), not `CommercialOccupancyUnavailableError`.  
- G-07…G-11, G-02, G-03 unchanged.

## POLICY GAPS

None for G-06. Did not invent a new HTTP status.

## NEXT PROGRAM

Operator-selected. **Not started:** G-07, G-03, POS-READ-APIS-IMPLEMENTATION-1.

## FINAL

**STOP.**
